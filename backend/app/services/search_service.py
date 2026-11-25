import time
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import Collection, CollectionStatus, DatasetRow
from app.providers.embedding.factory import EmbeddingProviderFactory
from app.repositories.vector_store import VectorStoreRepository
from app.schemas.api import (
    SearchEvaluationResponse,
    SearchIntentResponse,
    SearchResponse,
    SearchResultResponse,
)
from app.services.query_intent import merge_metadata_filters
from app.services.settings_service import SettingsService
from app.utils.metadata_filters import MetadataFilterCondition, conditions_to_dict, row_matches_conditions
from app.utils.text_builder import build_embedding_text


class SearchService:
    def __init__(self, db: Session):
        self.db = db
        self.settings_service = SettingsService(db)
        self.vector_store = VectorStoreRepository(db)

    async def search(
        self,
        collection_id: UUID,
        query: str,
        top_k: int,
        threshold: float,
        metadata_filters: list[MetadataFilterCondition] | None = None,
    ) -> SearchResponse:
        collection = self.db.query(Collection).filter_by(id=collection_id).one_or_none()
        if not collection or collection.status != CollectionStatus.READY.value:
            raise ValueError("Collection is not ready for search")
        if not collection.vector_table_name or not collection.dimensions:
            raise ValueError("Collection vector storage is not initialized")

        effective_filters, intent = merge_metadata_filters(query, metadata_filters)
        strict_filter = bool(effective_filters)

        filter_match_count = 0
        if strict_filter and collection.vector_table_name:
            filter_match_count = self.vector_store.count_filtered_rows(
                collection.vector_table_name,
                collection.dataset_id,
                effective_filters,
            )

        intent_response = SearchIntentResponse(
            appliedFilters=conditions_to_dict(effective_filters),
            inferredFilters=intent.filters,
            filterMatchCount=filter_match_count,
            strictFilterApplied=strict_filter,
            intentReasons=intent.reasons,
        )

        if strict_filter and filter_match_count == 0:
            return SearchResponse(
                results=[],
                evaluation=SearchEvaluationResponse(
                    queryEmbeddingMs=0.0,
                    vectorSearchMs=0.0,
                    totalMs=0.0,
                    modelUsed=collection.model_name,
                    collectionUsed=collection.display_name,
                ),
                intent=intent_response,
            )

        provider = EmbeddingProviderFactory.get_provider(self.settings_service)
        embed_start = time.perf_counter()
        vectors = await provider.embed_texts(collection.model_id, [query])
        embed_ms = (time.perf_counter() - embed_start) * 1000
        if not vectors:
            raise ValueError("Failed to generate query embedding")

        effective_threshold = 0.0 if strict_filter else threshold

        search_start = time.perf_counter()
        matches = self.vector_store.search(
            collection.vector_table_name,
            vectors[0],
            top_k=top_k,
            threshold=effective_threshold,
            metadata_filters=effective_filters or None,
        )
        search_ms = (time.perf_counter() - search_start) * 1000

        row_ids = [row_id for row_id, _ in matches]
        rows = (
            self.db.query(DatasetRow).filter(DatasetRow.id.in_(row_ids)).all()
            if row_ids
            else []
        )
        row_map = {row.id: row for row in rows}

        results: list[SearchResultResponse] = []
        rank = 0
        for row_id, score in matches:
            row = row_map.get(row_id)
            if not row:
                continue
            if strict_filter and not row_matches_conditions(row.data, effective_filters):
                continue
            rank += 1
            embedding_text = build_embedding_text(row.data, list(collection.selected_columns))
            metadata = {key: str(value) for key, value in row.data.items() if value is not None}
            results.append(
                SearchResultResponse(
                    rank=rank,
                    score=round(score, 4),
                    row=row.data,
                    metadata=metadata,
                    embeddingText=embedding_text,
                )
            )

        return SearchResponse(
            results=results,
            evaluation=SearchEvaluationResponse(
                queryEmbeddingMs=round(embed_ms, 2),
                vectorSearchMs=round(search_ms, 2),
                totalMs=round(embed_ms + search_ms, 2),
                modelUsed=collection.model_name,
                collectionUsed=collection.display_name,
            ),
            intent=intent_response,
        )

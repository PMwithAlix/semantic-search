from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.api import SearchRequest, SearchResponse
from app.services.search_service import SearchService

router = APIRouter()


@router.post("", response_model=SearchResponse)
async def semantic_search(payload: SearchRequest, db: Session = Depends(get_db)):
    service = SearchService(db)
    try:
        from app.utils.metadata_filters import MetadataFilterCondition

        manual_filters = None
        if payload.metadata_filters:
            manual_filters = [
                MetadataFilterCondition(
                    field=item.field,
                    operator=item.operator,
                    value=item.value,
                    field_type=item.field_type,
                )
                for item in payload.metadata_filters
            ]
        return await service.search(
            collection_id=payload.collection_id,
            query=payload.query,
            top_k=payload.top_k,
            threshold=payload.threshold,
            metadata_filters=manual_filters,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

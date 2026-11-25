import re
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.utils.metadata_filters import MetadataFilterCondition, build_filter_sql


class VectorStoreRepository:
    """Abstraction over pgvector storage. One physical table per collection."""

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def safe_table_name(collection_id: UUID) -> str:
        return f"cv_{str(collection_id).replace('-', '')}"

    def list_embedded_row_ids(self, table_name: str) -> set[UUID]:
        if not re.fullmatch(r"cv_[0-9a-f]{32}", table_name):
            raise ValueError("Invalid vector table name")
        sql = text(f"SELECT dataset_row_id FROM {table_name}")
        result = self.db.execute(sql)
        return {UUID(str(row[0])) for row in result.fetchall()}

    def drop_collection_table(self, table_name: str) -> None:
        if not re.fullmatch(r"cv_[0-9a-f]{32}", table_name):
            raise ValueError("Invalid vector table name")
        self.db.execute(text(f"DROP TABLE IF EXISTS {table_name}"))

    def ensure_collection_table(self, collection_id: UUID, dimensions: int) -> str:
        table_name = self.safe_table_name(collection_id)
        ddl = text(
            f"""
            CREATE TABLE IF NOT EXISTS {table_name} (
                dataset_row_id UUID PRIMARY KEY REFERENCES dataset_rows(id) ON DELETE CASCADE,
                embedding vector({dimensions}) NOT NULL
            )
            """
        )
        self.db.execute(ddl)
        self.db.commit()
        return table_name

    def upsert_vectors(self, table_name: str, rows: list[tuple[UUID, list[float]]]) -> None:
        if not rows:
            return
        if not re.fullmatch(r"cv_[0-9a-f]{32}", table_name):
            raise ValueError("Invalid vector table name")
        values_sql = []
        params: dict[str, object] = {}
        for idx, (row_id, vector) in enumerate(rows):
            values_sql.append(f"(:row_id_{idx}, :embedding_{idx})")
            params[f"row_id_{idx}"] = str(row_id)
            params[f"embedding_{idx}"] = self._vector_literal(vector)
        sql = text(
            f"""
            INSERT INTO {table_name} (dataset_row_id, embedding)
            VALUES {", ".join(values_sql)}
            ON CONFLICT (dataset_row_id)
            DO UPDATE SET embedding = EXCLUDED.embedding
            """
        )
        self.db.execute(sql, params)
        self.db.commit()

    def count_filtered_rows(
        self,
        table_name: str,
        dataset_id: UUID,
        metadata_filters: list[MetadataFilterCondition] | None = None,
    ) -> int:
        if not re.fullmatch(r"cv_[0-9a-f]{32}", table_name):
            raise ValueError("Invalid vector table name")

        where_clauses = ["dr.dataset_id = :dataset_id"]
        params: dict[str, object] = {"dataset_id": str(dataset_id)}

        if metadata_filters:
            where_clauses.extend(build_filter_sql(metadata_filters, params))

        sql = text(
            f"""
            SELECT COUNT(*)
            FROM {table_name} v
            JOIN dataset_rows dr ON dr.id = v.dataset_row_id
            WHERE {" AND ".join(where_clauses)}
            """
        )
        result = self.db.execute(sql, params).scalar()
        return int(result or 0)

    def search(
        self,
        table_name: str,
        query_vector: list[float],
        top_k: int,
        threshold: float,
        metadata_filters: list[MetadataFilterCondition] | None = None,
    ) -> list[tuple[UUID, float]]:
        if not re.fullmatch(r"cv_[0-9a-f]{32}", table_name):
            raise ValueError("Invalid vector table name")

        where_clauses = ["1 - (v.embedding <=> :query_vec) >= :threshold"]
        params: dict[str, object] = {
            "query_vec": self._vector_literal(query_vector),
            "threshold": threshold,
            "top_k": top_k,
        }
        if metadata_filters:
            where_clauses.extend(build_filter_sql(metadata_filters, params))

        sql = text(
            f"""
            SELECT dr.id,
                   1 - (v.embedding <=> :query_vec) AS score
            FROM {table_name} v
            JOIN dataset_rows dr ON dr.id = v.dataset_row_id
            WHERE {" AND ".join(where_clauses)}
            ORDER BY v.embedding <=> :query_vec
            LIMIT :top_k
            """
        )
        result = self.db.execute(sql, params)
        return [(UUID(str(row[0])), float(row[1])) for row in result.fetchall()]

    @staticmethod
    def _vector_literal(vector: list[float]) -> str:
        return "[" + ",".join(f"{v:.8f}" for v in vector) + "]"

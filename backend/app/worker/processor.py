import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.entities import Collection, CollectionStatus, DatasetRow, Job, JobStage, JobStatus, JobType
from app.providers.embedding.factory import EmbeddingProviderFactory
from app.repositories.vector_store import VectorStoreRepository
from app.services.dataset_service import DatasetService
from app.services.job_service import JobService
from app.services.settings_service import SettingsService
from app.utils.text_builder import build_embedding_text

logger = logging.getLogger(__name__)


class WorkerProcessor:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.dataset_service = DatasetService(db)
        self.job_service = JobService(db)
        self.settings_service = SettingsService(db)
        self.vector_store = VectorStoreRepository(db)

    def _next_job(self) -> Job | None:
        running = (
            self.db.query(Job)
            .filter(Job.is_active.is_(True), Job.status == JobStatus.RUNNING.value)
            .order_by(Job.created_at.asc())
            .first()
        )
        if running:
            return running
        return self.job_service.activate_next_job()

    async def run_forever(self) -> None:
        while True:
            try:
                job = self._next_job()
                if not job:
                    await asyncio.sleep(self.settings.worker_poll_interval_seconds)
                    continue
                await self.process_job(job)
            except Exception as exc:
                logger.exception("Worker loop error: %s", exc)
                self.db.rollback()
                await asyncio.sleep(self.settings.worker_poll_interval_seconds)

    async def process_job(self, job: Job) -> None:
        try:
            if job.type == JobType.IMPORT.value:
                job.stage = JobStage.GENERATING.value
                self.db.commit()
                self.dataset_service.import_dataset_rows(job)
            elif job.type == JobType.EMBEDDING.value:
                await self._process_embedding_job(job)
            else:
                raise ValueError(f"Unsupported job type: {job.type}")
            job.completed_at = datetime.now(timezone.utc)
            self.db.commit()
        except Exception as exc:
            logger.exception("Job failed id=%s", job.id)
            self.db.rollback()
            job = self.db.query(Job).filter_by(id=job.id).one_or_none()
            if not job:
                return
            job.status = JobStatus.FAILED.value
            job.stage = JobStage.COMPLETED.value
            job.error_message = str(exc)
            job.is_active = False
            job.completed_at = datetime.now(timezone.utc)
            if job.collection_id:
                collection = self.db.query(Collection).filter_by(id=job.collection_id).one_or_none()
                if collection and collection.status != CollectionStatus.READY.value:
                    collection.status = CollectionStatus.ERROR.value
                    collection.error_message = str(exc)
            self.db.commit()

    async def _process_embedding_job(self, job: Job) -> None:
        collection = self.db.query(Collection).filter_by(id=job.collection_id).one_or_none()
        if not collection:
            raise ValueError("Collection not found for embedding job")

        provider = EmbeddingProviderFactory.get_provider(self.settings_service)
        rows = (
            self.db.query(DatasetRow)
            .filter_by(dataset_id=job.dataset_id)
            .order_by(DatasetRow.row_number.asc())
            .all()
        )
        job.stage = JobStage.GENERATING.value
        job.rows_total = len(rows)
        self.db.commit()

        embedded_ids: set[UUID] = set()
        if collection.vector_table_name:
            embedded_ids = self.vector_store.list_embedded_row_ids(collection.vector_table_name)
            if embedded_ids:
                job.rows_successful = len(embedded_ids)
                collection.vector_count = len(embedded_ids)
                logger.info(
                    "Resuming embedding job id=%s with %s existing vectors",
                    job.id,
                    len(embedded_ids),
                )

        batch_size = self.settings.embedding_batch_size
        rows_processed = 0

        for start in range(0, len(rows), batch_size):
            batch_rows = rows[start : start + batch_size]
            rows_processed += len(batch_rows)

            if batch_rows and all(row.id in embedded_ids for row in batch_rows):
                job.rows_processed = rows_processed
                job.progress = min(99.0, (rows_processed / max(job.rows_total, 1)) * 100)
                self.db.commit()
                continue

            texts = [
                build_embedding_text(row.data, list(job.selected_columns or []))
                for row in batch_rows
                if row.id not in embedded_ids
            ]
            pending_rows = [row for row in batch_rows if row.id not in embedded_ids]
            valid_pairs = [
                (row, text)
                for row, text in zip(pending_rows, texts)
                if text.strip()
            ]

            empty_skipped = len(pending_rows) - len(valid_pairs)
            if not valid_pairs:
                job.rows_processed = rows_processed
                job.rows_failed += empty_skipped
                job.progress = min(99.0, (rows_processed / max(job.rows_total, 1)) * 100)
                self.db.commit()
                continue

            vectors = await provider.embed_texts(collection.model_id, [text for _, text in valid_pairs])
            if not vectors:
                raise ValueError("Embedding provider returned no vectors")
            if collection.dimensions is None:
                collection.dimensions = len(vectors[0])
                table_name = self.vector_store.ensure_collection_table(collection.id, collection.dimensions)
                collection.vector_table_name = table_name
                self.db.commit()

            table_name = collection.vector_table_name
            if not table_name:
                raise ValueError("Vector table was not created")

            job.stage = JobStage.WRITING.value
            payload = [(row.id, vector) for (row, _), vector in zip(valid_pairs, vectors)]
            self.vector_store.upsert_vectors(table_name, payload)
            for row_id, _ in payload:
                embedded_ids.add(row_id)

            job.rows_processed = rows_processed
            job.rows_successful = len(embedded_ids)
            job.rows_failed += empty_skipped
            job.progress = min(99.0, (rows_processed / max(job.rows_total, 1)) * 100)
            self.db.commit()

        collection.vector_count = job.rows_successful
        collection.status = CollectionStatus.READY.value
        collection.error_message = None
        job.progress = 100.0
        job.stage = JobStage.COMPLETED.value
        job.status = JobStatus.COMPLETED.value
        job.is_active = False
        self.db.commit()

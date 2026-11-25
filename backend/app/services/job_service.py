import hashlib
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.entities import Collection, CollectionStatus, Dataset, DatasetStatus, Job, JobStage, JobStatus, JobType
from app.services.model_catalog_service import ModelCatalogService
from app.utils.naming import collection_name


class JobService:
    def __init__(self, db: Session):
        self.db = db
        self.model_catalog = ModelCatalogService()

    def list_jobs(self) -> list[Job]:
        return self.db.query(Job).order_by(Job.created_at.desc()).all()

    def get_job(self, job_id: uuid.UUID) -> Job | None:
        return self.db.query(Job).filter_by(id=job_id).one_or_none()

    def _has_active_job(self) -> bool:
        return (
            self.db.query(Job)
            .filter(Job.is_active.is_(True), Job.status.in_([JobStatus.RUNNING.value, JobStatus.QUEUED.value]))
            .count()
            > 0
        )

    def create_embedding_job(self, dataset_id: uuid.UUID, model_id: str, selected_columns: list[str]) -> Job:
        dataset = self.db.query(Dataset).filter_by(id=dataset_id).one_or_none()
        if not dataset:
            raise ValueError("Dataset not found")
        if dataset.status != DatasetStatus.IMPORTED.value:
            raise ValueError("Dataset must be imported before embedding")

        model = self.model_catalog.get_model(model_id)
        if not model:
            raise ValueError("Embedding model not found")

        missing = [column for column in selected_columns if column not in {c.name for c in dataset.columns}]
        if missing:
            raise ValueError(f"Selected columns not found in dataset: {', '.join(missing)}")

        name, display_name = collection_name(dataset.name, model_id, selected_columns)
        columns_hash = hashlib.sha1(",".join(selected_columns).encode("utf-8")).hexdigest()
        existing = (
            self.db.query(Collection)
            .filter_by(dataset_id=dataset.id, model_id=model_id, columns_hash=columns_hash)
            .one_or_none()
        )
        if existing and existing.status == CollectionStatus.READY.value:
            raise ValueError("A ready collection already exists for this dataset/model/columns combination")
        if existing and existing.status == CollectionStatus.BUILDING.value:
            failed_job = (
                self.db.query(Job)
                .filter(
                    Job.collection_id == existing.id,
                    Job.type == JobType.EMBEDDING.value,
                    Job.status == JobStatus.FAILED.value,
                )
                .order_by(Job.created_at.desc())
                .first()
            )
            if failed_job:
                raise ValueError(
                    "An embedding job failed for this collection. Resume the failed job instead of creating a new one."
                )
            raise ValueError("An embedding job is already in progress for this collection")

        collection = existing or Collection(
            name=name,
            display_name=display_name,
            dataset_id=dataset.id,
            model_id=model_id,
            model_name=model_id,
            provider=model.get("provider") or "avalai",
            selected_columns=selected_columns,
            columns_hash=columns_hash,
            status=CollectionStatus.BUILDING.value,
        )
        if not existing:
            self.db.add(collection)
            self.db.flush()

        queued = self._has_active_job()
        job = Job(
            type=JobType.EMBEDDING.value,
            dataset_id=dataset.id,
            collection_id=collection.id,
            model_id=model_id,
            selected_columns=selected_columns,
            status=JobStatus.QUEUED.value if queued else JobStatus.RUNNING.value,
            stage=JobStage.QUEUED.value if queued else JobStage.PREPARING.value,
            rows_total=dataset.row_count,
            is_active=not queued,
            started_at=None if queued else datetime.now(timezone.utc),
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def activate_next_job(self) -> Job | None:
        running = (
            self.db.query(Job)
            .filter(Job.is_active.is_(True), Job.status == JobStatus.RUNNING.value)
            .one_or_none()
        )
        if running:
            return None
        next_job = (
            self.db.query(Job)
            .filter(Job.status == JobStatus.QUEUED.value)
            .order_by(Job.created_at.asc())
            .first()
        )
        if not next_job:
            return None
        next_job.status = JobStatus.RUNNING.value
        next_job.stage = JobStage.PREPARING.value
        next_job.is_active = True
        next_job.started_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(next_job)
        return next_job

    def resume_embedding_job(self, job_id: uuid.UUID) -> Job:
        job = self.get_job(job_id)
        if not job:
            raise ValueError("Job not found")
        if job.type != JobType.EMBEDDING.value:
            raise ValueError("Only embedding jobs can be resumed")
        if job.status != JobStatus.FAILED.value:
            raise ValueError("Only failed jobs can be resumed")
        if job.rows_successful <= 0:
            raise ValueError("This job has no embedded rows to resume from")

        collection = (
            self.db.query(Collection).filter_by(id=job.collection_id).one_or_none()
            if job.collection_id
            else None
        )
        if not collection:
            raise ValueError("Collection not found for this job")

        queued = self._has_active_job()
        job.status = JobStatus.QUEUED.value if queued else JobStatus.RUNNING.value
        job.stage = JobStage.QUEUED.value if queued else JobStage.WRITING.value
        job.error_message = None
        job.is_active = not queued
        job.completed_at = None
        if not queued and not job.started_at:
            job.started_at = datetime.now(timezone.utc)

        collection.status = CollectionStatus.BUILDING.value
        collection.error_message = None

        self.db.commit()
        self.db.refresh(job)
        return job

import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.entities import Collection, Dataset, DatasetColumn, DatasetRow, DatasetStatus, Job, JobStage, JobStatus, JobType
from app.repositories.vector_store import VectorStoreRepository
from app.utils.csv_utils import analyze_csv, iter_csv_rows


class DatasetService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def list_datasets(self) -> list[Dataset]:
        return self.db.query(Dataset).order_by(Dataset.created_at.desc()).all()

    def get_dataset(self, dataset_id: uuid.UUID) -> Dataset | None:
        return self.db.query(Dataset).filter_by(id=dataset_id).one_or_none()

    async def upload_dataset(self, upload: UploadFile) -> Dataset:
        if not upload.filename or not upload.filename.lower().endswith(".csv"):
            raise ValueError("Only CSV files are supported")

        content = await upload.read()
        max_bytes = self.settings.max_upload_size_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise ValueError(f"File exceeds maximum size of {self.settings.max_upload_size_mb} MB")

        analysis = analyze_csv(content)
        if self.settings.max_rows is not None and analysis["row_count"] > self.settings.max_rows:
            raise ValueError(f"CSV exceeds maximum row limit of {self.settings.max_rows}")

        upload_dir = Path(self.settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        dataset_id = uuid.uuid4()
        stored_name = f"{dataset_id}_{upload.filename}"
        stored_path = upload_dir / stored_name
        stored_path.write_bytes(content)

        dataset = Dataset(
            id=dataset_id,
            name=upload.filename,
            file_name=upload.filename,
            stored_file_path=str(stored_path),
            file_size_bytes=len(content),
            row_count=analysis["row_count"],
            column_count=len(analysis["columns"]),
            status=DatasetStatus.READY.value,
            encoding=analysis["encoding"],
            delimiter=analysis["delimiter"],
        )
        self.db.add(dataset)
        for column in analysis["columns"]:
            self.db.add(
                DatasetColumn(
                    dataset_id=dataset.id,
                    name=column["name"],
                    position=column["position"],
                    inferred_type=column["inferred_type"],
                    non_null_count=column["non_null_count"],
                    unique_count=column["unique_count"],
                    example_value=column["example_value"],
                )
            )
        for idx, row in enumerate(analysis["rows"][:10], start=1):
            self.db.add(DatasetRow(dataset_id=dataset.id, row_number=idx, data=row))
        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def create_import_job(self, dataset_id: uuid.UUID) -> Job:
        dataset = self.get_dataset(dataset_id)
        if not dataset:
            raise ValueError("Dataset not found")
        if dataset.status == DatasetStatus.IMPORTED.value:
            raise ValueError("Dataset is already imported")

        active = (
            self.db.query(Job)
            .filter(Job.is_active.is_(True), Job.status.in_([JobStatus.RUNNING.value, JobStatus.QUEUED.value]))
            .count()
        )
        job = Job(
            type=JobType.IMPORT.value,
            dataset_id=dataset.id,
            status=JobStatus.QUEUED.value if active else JobStatus.RUNNING.value,
            stage=JobStage.QUEUED.value if active else JobStage.PREPARING.value,
            rows_total=dataset.row_count,
            is_active=not bool(active),
        )
        dataset.status = DatasetStatus.IMPORTING.value
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def delete_dataset(self, dataset_id: uuid.UUID) -> None:
        dataset = self.get_dataset(dataset_id)
        if not dataset:
            raise ValueError("Dataset not found")

        vector_store = VectorStoreRepository(self.db)
        collections = self.db.query(Collection).filter(Collection.dataset_id == dataset.id).all()
        for collection in collections:
            if collection.vector_table_name:
                vector_store.drop_collection_table(collection.vector_table_name)

        path = Path(dataset.stored_file_path)
        if path.exists():
            path.unlink(missing_ok=True)

        self.db.delete(dataset)
        self.db.commit()

    def import_dataset_rows(self, job: Job) -> None:
        dataset = self.get_dataset(job.dataset_id)
        if not dataset:
            raise ValueError("Dataset not found")

        content = Path(dataset.stored_file_path).read_bytes()
        self.db.query(DatasetRow).filter(DatasetRow.dataset_id == dataset.id).delete()

        batch: list[DatasetRow] = []
        imported_count = 0
        for idx, row in enumerate(iter_csv_rows(content, encoding=dataset.encoding), start=1):
            batch.append(DatasetRow(dataset_id=dataset.id, row_number=idx, data=row))
            imported_count = idx
            if len(batch) >= 500:
                self.db.bulk_save_objects(batch)
                self.db.commit()
                job.rows_processed += len(batch)
                job.rows_successful += len(batch)
                job.progress = min(99.0, (job.rows_processed / max(job.rows_total, 1)) * 100)
                self.db.commit()
                batch.clear()
        if batch:
            self.db.bulk_save_objects(batch)
            job.rows_processed += len(batch)
            job.rows_successful += len(batch)
        dataset.row_count = imported_count
        dataset.status = DatasetStatus.IMPORTED.value
        job.progress = 100.0
        job.stage = JobStage.COMPLETED.value
        job.status = JobStatus.COMPLETED.value
        job.is_active = False
        self.db.commit()

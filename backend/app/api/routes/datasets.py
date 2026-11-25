from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.api import CreateImportJobRequest, DatasetResponse, JobResponse
from app.services.dataset_service import DatasetService
from app.services.job_service import JobService
from app.services.model_catalog_service import ModelCatalogService
from app.services.serializers import serialize_dataset, serialize_job

router = APIRouter()


@router.get("", response_model=list[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    service = DatasetService(db)
    return [serialize_dataset(dataset) for dataset in service.list_datasets()]


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: UUID, db: Session = Depends(get_db)):
    service = DatasetService(db)
    dataset = service.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return serialize_dataset(dataset)


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    service = DatasetService(db)
    try:
        dataset = await service.upload_dataset(file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return serialize_dataset(dataset)


@router.post("/import-jobs", response_model=JobResponse)
def create_import_job(payload: CreateImportJobRequest, db: Session = Depends(get_db)):
    dataset_service = DatasetService(db)
    job_service = JobService(db)
    try:
        job = dataset_service.create_import_job(payload.dataset_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    dataset = dataset_service.get_dataset(job.dataset_id)
    return serialize_job(job, dataset.name if dataset else "")


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: UUID, db: Session = Depends(get_db)):
    service = DatasetService(db)
    try:
        service.delete_dataset(dataset_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Dataset cannot be deleted because related records are still in use.",
        ) from exc
    return {"status": "deleted"}

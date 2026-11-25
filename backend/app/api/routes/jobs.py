from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Collection, Dataset
from app.schemas.api import CreateEmbeddingJobRequest, JobResponse
from app.services.job_service import JobService
from app.services.model_catalog_service import ModelCatalogService
from app.services.serializers import serialize_job

router = APIRouter()


def _job_dimensions(db: Session, job, model: dict | None) -> int:
    if job.collection_id:
        collection = db.query(Collection).filter_by(id=job.collection_id).one_or_none()
        if collection and collection.dimensions:
            return collection.dimensions
    if model and model.get("dimensions"):
        return model["dimensions"]
    return 0


def _serialize_job(db: Session, job, catalog: ModelCatalogService) -> JobResponse:
    dataset = db.query(Dataset).filter_by(id=job.dataset_id).one_or_none()
    model = catalog.get_model(job.model_id) if job.model_id else None
    return serialize_job(
        job,
        dataset.name if dataset else "",
        model_name=model["name"] if model else (job.model_id or ""),
        provider=model["provider"] if model else "",
        dimensions=_job_dimensions(db, job, model),
    )


@router.get("", response_model=list[JobResponse])
def list_jobs(db: Session = Depends(get_db)):
    service = JobService(db)
    catalog = ModelCatalogService()
    return [_serialize_job(db, job, catalog) for job in service.list_jobs()]


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    service = JobService(db)
    job = service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _serialize_job(db, job, ModelCatalogService())


@router.post("/embedding", response_model=JobResponse)
def create_embedding_job(payload: CreateEmbeddingJobRequest, db: Session = Depends(get_db)):
    service = JobService(db)
    catalog = ModelCatalogService()
    try:
        job = service.create_embedding_job(payload.dataset_id, payload.model_id, payload.selected_columns)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _serialize_job(db, job, catalog)


@router.post("/{job_id}/resume", response_model=JobResponse)
def resume_job(job_id: UUID, db: Session = Depends(get_db)):
    service = JobService(db)
    catalog = ModelCatalogService()
    try:
        job = service.resume_embedding_job(job_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _serialize_job(db, job, catalog)

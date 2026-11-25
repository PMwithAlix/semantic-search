from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Collection, Dataset, DatasetColumn
from app.schemas.api import CollectionResponse
from app.services.serializers import serialize_collection

router = APIRouter()


@router.get("", response_model=list[CollectionResponse])
def list_collections(db: Session = Depends(get_db)):
    collections = db.query(Collection).order_by(Collection.created_at.desc()).all()
    responses = []
    for collection in collections:
        dataset = db.query(Dataset).filter_by(id=collection.dataset_id).one_or_none()
        columns = (
            db.query(DatasetColumn)
            .filter_by(dataset_id=collection.dataset_id)
            .order_by(DatasetColumn.position)
            .all()
            if dataset
            else []
        )
        responses.append(
            serialize_collection(collection, dataset.name if dataset else "", columns)
        )
    return responses


@router.get("/{collection_id}", response_model=CollectionResponse)
def get_collection(collection_id: UUID, db: Session = Depends(get_db)):
    collection = db.query(Collection).filter_by(id=collection_id).one_or_none()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    dataset = db.query(Dataset).filter_by(id=collection.dataset_id).one_or_none()
    columns = (
        db.query(DatasetColumn)
        .filter_by(dataset_id=collection.dataset_id)
        .order_by(DatasetColumn.position)
        .all()
        if dataset
        else []
    )
    return serialize_collection(collection, dataset.name if dataset else "", columns)

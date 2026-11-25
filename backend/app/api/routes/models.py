from fastapi import APIRouter

from app.schemas.api import EmbeddingModelResponse
from app.services.model_catalog_service import ModelCatalogService

router = APIRouter()


@router.get("/embeddings", response_model=list[EmbeddingModelResponse])
def list_embedding_models():
    service = ModelCatalogService()
    return [EmbeddingModelResponse(**model) for model in service.list_models()]

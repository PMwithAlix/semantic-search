from fastapi import APIRouter

from app.api.routes import collections, datasets, jobs, models, search, settings

api_router = APIRouter(prefix="/api")
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(models.router, prefix="/models", tags=["models"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(collections.router, prefix="/collections", tags=["collections"])
api_router.include_router(search.router, prefix="/search", tags=["search"])

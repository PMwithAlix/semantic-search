import json
from functools import lru_cache
from pathlib import Path

from app.config import get_settings


class ModelCatalogService:
    def __init__(self):
        self.settings = get_settings()

    @property
    def models_path(self) -> Path:
        return Path(self.settings.embedding_models_path)

    @lru_cache(maxsize=1)
    def _load_raw(self) -> dict:
        with self.models_path.open(encoding="utf-8") as handle:
            return json.load(handle)

    def list_models(self) -> list[dict]:
        payload = self._load_raw()
        models = []
        for item in payload.get("data", []):
            models.append(
                {
                    "id": item.get("id"),
                    "name": item.get("id"),
                    "display_name": item.get("id"),
                    "provider": item.get("owned_by"),
                    "mode": item.get("mode"),
                    "pricing": item.get("pricing"),
                    "max_tokens": item.get("max_tokens"),
                    "max_input_tokens": item.get("max_input_tokens"),
                    "supported_endpoints": item.get("supported_endpoints", []),
                    "tier_rate_limits": item.get("tier_rate_limits"),
                    "status": "available",
                    "dimensions": item.get("dimensions"),
                }
            )
        return models

    def get_model(self, model_id: str) -> dict | None:
        return next((model for model in self.list_models() if model["id"] == model_id), None)

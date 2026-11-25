import asyncio
import logging

import httpx

from app.config import get_settings
from app.providers.embedding.base import EmbeddingProvider

logger = logging.getLogger(__name__)


class AvalAIEmbeddingProvider(EmbeddingProvider):
    provider_name = "avalai"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.settings = get_settings()

    async def embed_texts(self, model_id: str, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        url = f"{self.settings.avalai_base_url.rstrip('/')}/embeddings"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {"model": model_id, "input": texts}

        last_error: Exception | None = None
        for attempt in range(1, self.settings.embedding_max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=180.0) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    response.raise_for_status()
                    data = response.json()
                    items = sorted(data.get("data", []), key=lambda item: item.get("index", 0))
                    return [item["embedding"] for item in items]
            except Exception as exc:
                last_error = exc
                logger.warning("Embedding request failed attempt=%s model=%s error=%s", attempt, model_id, exc)
                if attempt < self.settings.embedding_max_retries:
                    await asyncio.sleep(2 ** attempt)
        detail = str(last_error) if last_error else "unknown error"
        raise RuntimeError(f"Embedding request failed for model {model_id}: {detail}") from last_error

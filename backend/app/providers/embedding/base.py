from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    provider_name: str = "base"

    @abstractmethod
    async def embed_texts(self, model_id: str, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError

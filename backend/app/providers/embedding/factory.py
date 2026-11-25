from app.providers.embedding.avalai import AvalAIEmbeddingProvider
from app.providers.embedding.base import EmbeddingProvider
from app.services.settings_service import SettingsService


class EmbeddingProviderFactory:
    @staticmethod
    def get_provider(settings_service: SettingsService) -> EmbeddingProvider:
        api_key = settings_service.get_avalai_api_key()
        if not api_key:
            raise ValueError("AvalAI API key is not configured")
        return AvalAIEmbeddingProvider(api_key=api_key)

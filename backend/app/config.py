from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Semantic Search Platform"
    debug: bool = False
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/semantic_search"
    upload_dir: Path = Path("../uploads")
    embedding_models_path: Path = Path("../embedding_models.json")
    avalai_api_key: str | None = None
    avalai_base_url: str = "https://api.avalai.ir/v1"
    settings_encryption_key: str = "change-me-in-production-use-32-byte-key!!"
    max_upload_size_mb: int = 100
    max_rows: int | None = None
    embedding_batch_size: int = 10
    embedding_max_retries: int = 3
    worker_poll_interval_seconds: float = 2.0
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

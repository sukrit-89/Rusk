from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Rusk AI"
    local_api_key: str = Field(default="local-dev-key", alias="LOCAL_API_KEY")
    database_url: str = Field(default="postgresql://rag:rag@localhost:5432/rag", alias="DATABASE_URL")
    ollama_host: str = Field(default="http://localhost:11434", alias="OLLAMA_HOST")
    ollama_model: str = Field(default="mistral", alias="OLLAMA_MODEL")
    llava_model: str = Field(default="llava", alias="LLAVA_MODEL")
    embedding_model: str = Field(default="sentence-transformers/all-MiniLM-L6-v2", alias="EMBEDDING_MODEL")
    hosted_llm_base_url: str | None = Field(default=None, alias="HOSTED_LLM_BASE_URL")
    hosted_llm_api_key: str | None = Field(default=None, alias="HOSTED_LLM_API_KEY")
    tee_mode: str = Field(default="none", alias="TEE_MODE")
    nearai_attestation_url: str | None = Field(default=None, alias="NEARAI_ATTESTATION_URL")
    nearai_verify_url: str | None = Field(default=None, alias="NEARAI_VERIFY_URL")
    sealed_storage_dir: Path = Field(default=Path("sealed"), alias="SEALED_STORAGE_DIR")
    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_anon_key: str | None = Field(default=None, alias="SUPABASE_ANON_KEY")
    require_supabase_jwt: bool = Field(default=False, alias="REQUIRE_SUPABASE_JWT")
    chunk_size: int = Field(default=512, alias="CHUNK_SIZE")
    chunk_overlap: int = Field(default=50, alias="CHUNK_OVERLAP")
    top_k: int = Field(default=5, alias="TOP_K")
    upload_dir: Path = Field(default=Path("uploads"), alias="UPLOAD_DIR")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.sealed_storage_dir.mkdir(parents=True, exist_ok=True)
    return settings

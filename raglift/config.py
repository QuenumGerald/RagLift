from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover
    import tomli as tomllib


class EmbeddingsConfig(BaseModel):
    provider: Literal["openai", "fake"] = "openai"
    model: str = "text-embedding-3-small"


class LLMConfig(BaseModel):
    provider: Literal["openai", "fake"] = "openai"
    model: str = "gpt-4o-mini"


class VectorStoreConfig(BaseModel):
    provider: Literal["chroma"] = "chroma"
    persist_directory: str = ".raglift/chroma"
    collection_name: str = "raglift"


class ChunkingConfig(BaseModel):
    chunk_size: int = 1000
    chunk_overlap: int = 150


class RagLiftConfig(BaseModel):
    embeddings: EmbeddingsConfig = Field(default_factory=EmbeddingsConfig)
    llm: LLMConfig = Field(default_factory=LLMConfig)
    vector_store: VectorStoreConfig = Field(default_factory=VectorStoreConfig)
    chunking: ChunkingConfig = Field(default_factory=ChunkingConfig)


class EnvSettings(BaseSettings):
    openai_api_key: str | None = None
    raglift_config: str = "raglift.toml"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


def load_config(path: str | Path = "raglift.toml") -> RagLiftConfig:
    load_dotenv()
    config_path = Path(path)
    if not config_path.exists():
        return RagLiftConfig()
    with config_path.open("rb") as handle:
        data = tomllib.load(handle)
    return RagLiftConfig.model_validate(data)


def write_default_config(path: Path) -> None:
    path.write_text(
        """[embeddings]\nprovider = \"openai\"\nmodel = \"text-embedding-3-small\"\n\n[llm]\nprovider = \"openai\"\nmodel = \"gpt-4o-mini\"\n\n[vector_store]\nprovider = \"chroma\"\npersist_directory = \".raglift/chroma\"\ncollection_name = \"raglift\"\n\n[chunking]\nchunk_size = 1000\nchunk_overlap = 150\n""",
        encoding="utf-8",
    )

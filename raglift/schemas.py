from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


class Source(BaseModel):
    path: str
    chunk_id: str
    content_preview: str


class AskResponse(BaseModel):
    text: str
    sources: list[Source] = Field(default_factory=list)


class IngestedChunk(BaseModel):
    id: str
    path: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class DocumentInput(BaseModel):
    path: Path
    content: str

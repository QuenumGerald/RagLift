from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel

from raglift.config import EnvSettings
from raglift.graph import RAGGraph

app = FastAPI(title="RagLift")
DOCS_DIR = Path("docs")


class ChatRequest(BaseModel):
    question: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/documents/upload")
async def upload_document(file: Annotated[UploadFile, File(...)]) -> dict[str, str]:
    DOCS_DIR.mkdir(exist_ok=True)
    destination = DOCS_DIR / Path(file.filename or "upload.txt").name
    destination.write_bytes(await file.read())
    return {"path": str(destination)}


@app.post("/api/documents/ingest")
def ingest_documents(path: str = "docs") -> dict[str, int]:
    ids = RAGGraph.from_config(EnvSettings().raglift_config).ingest(path)
    return {"chunks": len(ids)}


@app.post("/api/chat")
def chat(request: ChatRequest) -> dict[str, object]:
    response = RAGGraph.from_config(EnvSettings().raglift_config).ask(request.question)
    return {
        "answer": response.text,
        "sources": [source.model_dump() for source in response.sources],
    }

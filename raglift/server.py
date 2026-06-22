from pathlib import Path
from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel

from raglift.config import EnvSettings
from raglift.graph import RAGGraph

app = FastAPI(title="RagLift")


class ChatRequest(BaseModel):
    question: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)) -> dict[str, str]:
    docs = Path("docs")
    docs.mkdir(exist_ok=True)
    destination = docs / Path(file.filename or "upload.txt").name
    destination.write_bytes(await file.read())
    return {"path": str(destination)}


@app.post("/api/documents/ingest")
def ingest_documents(path: str = "docs") -> dict[str, int]:
    ids = RAGGraph.from_config(EnvSettings().raglift_config).ingest(path)
    return {"chunks": len(ids)}


@app.post("/api/chat")
def chat(request: ChatRequest) -> dict[str, object]:
    response = RAGGraph.from_config(EnvSettings().raglift_config).ask(request.question)
    return {"answer": response.text, "sources": [source.model_dump() for source in response.sources]}

from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel

from raglift import RAGGraph

app = FastAPI(title="RagLift App")


class ChatRequest(BaseModel):
    question: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/documents/upload")
async def upload(file: UploadFile = File(...)):
    docs = Path("docs")
    docs.mkdir(exist_ok=True)
    target = docs / Path(file.filename or "upload.txt").name
    target.write_bytes(await file.read())
    return {"path": str(target)}


@app.post("/api/documents/ingest")
def ingest(path: str = "docs"):
    return {"chunks": len(RAGGraph.from_config("raglift.toml").ingest(path))}


@app.post("/api/chat")
def chat(request: ChatRequest):
    answer = RAGGraph.from_config("raglift.toml").ask(request.question)
    return {"answer": answer.text, "sources": [s.model_dump() for s in answer.sources]}

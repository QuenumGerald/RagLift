from hashlib import sha1
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from raglift.config import ChunkingConfig
from raglift.schemas import IngestedChunk

SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf"}


def read_document(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md"}:
        return path.read_text(encoding="utf-8")
    if suffix == ".pdf":
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    raise ValueError(f"Unsupported document type: {path}")


def iter_document_paths(path: str | Path) -> list[Path]:
    root = Path(path)
    if root.is_file():
        return [root] if root.suffix.lower() in SUPPORTED_EXTENSIONS else []
    return sorted(
        p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def chunk_documents(path: str | Path, config: ChunkingConfig) -> list[IngestedChunk]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.chunk_size,
        chunk_overlap=config.chunk_overlap,
    )
    chunks: list[IngestedChunk] = []
    for doc_path in iter_document_paths(path):
        text = read_document(doc_path)
        for index, content in enumerate(splitter.split_text(text)):
            chunk_id = sha1(f"{doc_path}:{index}:{content}".encode()).hexdigest()[:12]
            chunks.append(
                IngestedChunk(
                    id=chunk_id,
                    path=str(doc_path),
                    content=content,
                    metadata={"path": str(doc_path), "chunk_id": chunk_id, "chunk_index": index},
                )
            )
    return chunks


def to_langchain_documents(chunks: list[IngestedChunk]) -> list[Document]:
    return [Document(page_content=c.content, metadata=c.metadata) for c in chunks]

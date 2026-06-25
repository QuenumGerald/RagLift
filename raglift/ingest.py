from hashlib import sha1
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from raglift.config import ChunkingConfig
from raglift.schemas import IngestedChunk

SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf"}


class IngestError(ValueError):
    """User-facing ingestion error safe to print from the CLI."""


def read_document(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md"}:
        return path.read_text(encoding="utf-8")
    if suffix == ".pdf":
        try:
            reader = PdfReader(str(path))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except (PdfReadError, OSError) as exc:
            raise IngestError(f"PDF could not be read or is empty: {path}") from exc
        if not text.strip():
            raise IngestError(f"PDF could not be read or is empty: {path}")
        return text
    raise IngestError(
        f"Unsupported document type: {path}. Supported extensions are: "
        f"{', '.join(sorted(SUPPORTED_EXTENSIONS))}."
    )


def iter_document_paths(path: str | Path) -> list[Path]:
    root = Path(path)
    if not root.exists():
        raise IngestError(f"Document path not found: {root}")
    if root.is_file():
        if root.suffix.lower() not in SUPPORTED_EXTENSIONS:
            raise IngestError(
                f"No supported documents found at {root}. Supported extensions are: "
                f"{', '.join(sorted(SUPPORTED_EXTENSIONS))}."
            )
        return [root]
    documents = sorted(
        p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    )
    if not documents:
        raise IngestError(
            f"No supported documents found in {root}. Add .txt, .md, or readable .pdf files."
        )
    return documents


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

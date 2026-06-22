from langchain_core.documents import Document

from raglift.schemas import Source


def build_sources(documents: list[Document], preview_chars: int = 180) -> list[Source]:
    sources: list[Source] = []
    seen: set[str] = set()
    for doc in documents:
        chunk_id = str(doc.metadata.get("chunk_id", ""))
        path = str(doc.metadata.get("path", doc.metadata.get("source", "")))
        key = f"{path}:{chunk_id}"
        if key in seen:
            continue
        seen.add(key)
        sources.append(
            Source(
                path=path,
                chunk_id=chunk_id,
                content_preview=doc.page_content[:preview_chars].replace("\n", " "),
            )
        )
    return sources

from typing import TypedDict

from langchain_core.documents import Document

from raglift.schemas import Source


class RAGState(TypedDict, total=False):
    question: str
    documents: list[Document]
    answer: str
    sources: list[Source]

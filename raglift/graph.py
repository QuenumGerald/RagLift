from pathlib import Path
from typing import Any

from langchain_core.documents import Document
from langgraph.graph import END, START, StateGraph

from raglift.citations import build_sources
from raglift.config import RagLiftConfig, load_config
from raglift.ingest import chunk_documents, to_langchain_documents
from raglift.retriever import build_embeddings, build_llm, build_vector_store
from raglift.schemas import AskResponse
from raglift.state import RAGState


class RAGGraph:
    """Small wrapper around an explicit LangGraph StateGraph for RAG."""

    def __init__(
        self,
        config: RagLiftConfig,
        embeddings: Any | None = None,
        llm: Any | None = None,
    ) -> None:
        self.config = config
        self.embeddings = embeddings or build_embeddings(config)
        self.llm = llm or build_llm(config)
        self.vector_store = build_vector_store(config, self.embeddings)
        self.app = self._build_graph()

    @classmethod
    def from_config(cls, path: str | Path = "raglift.toml", **kwargs: Any) -> "RAGGraph":
        return cls(load_config(path), **kwargs)

    def ingest(self, path: str | Path) -> list[str]:
        chunks = chunk_documents(path, self.config.chunking)
        documents = to_langchain_documents(chunks)
        ids = [chunk.id for chunk in chunks]
        if documents:
            self.vector_store.add_documents(documents, ids=ids)
        return ids

    def ask(self, question: str) -> AskResponse:
        state = self.app.invoke({"question": question})
        return AskResponse(text=state.get("answer", ""), sources=state.get("sources", []))

    def _build_graph(self):
        workflow = StateGraph(RAGState)
        workflow.add_node("retrieve", self._retrieve)
        workflow.add_node("generate_answer", self._generate_answer)
        workflow.add_node("attach_sources", self._attach_sources)
        workflow.add_edge(START, "retrieve")
        workflow.add_edge("retrieve", "generate_answer")
        workflow.add_edge("generate_answer", "attach_sources")
        workflow.add_edge("attach_sources", END)
        return workflow.compile()

    def _retrieve(self, state: RAGState) -> RAGState:
        docs = self.vector_store.similarity_search(state["question"], k=4)
        return {"documents": docs}

    def _generate_answer(self, state: RAGState) -> RAGState:
        context = "\n\n".join(_format_doc(doc) for doc in state.get("documents", []))
        prompt = (
            "Answer the question using only the context. "
            "If the context is insufficient, say so.\n\n"
            f"Context:\n{context}\n\nQuestion: {state['question']}"
        )
        result = self.llm.invoke(prompt)
        answer = getattr(result, "content", str(result))
        return {"answer": answer}

    def _attach_sources(self, state: RAGState) -> RAGState:
        return {"sources": build_sources(state.get("documents", []))}


def _format_doc(document: Document) -> str:
    path = document.metadata.get("path", "unknown")
    chunk_id = document.metadata.get("chunk_id", "")
    return f"Source: {path}#{chunk_id}\n{document.page_content}"

import os

from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.vectorstores import VectorStoreRetriever
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from raglift.config import RagLiftConfig


class FakeEmbeddings(Embeddings):
    def __init__(self, size: int = 16) -> None:
        self.size = size

    def _embed(self, text: str) -> list[float]:
        values = [0.0] * self.size
        for index, char in enumerate(text.encode("utf-8")):
            values[index % self.size] += float(char)
        total = sum(values) or 1.0
        return [v / total for v in values]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)


def build_embeddings(config: RagLiftConfig) -> Embeddings:
    if config.embeddings.provider == "fake":
        return FakeEmbeddings()
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError(
            "OPENAI_API_KEY is required for OpenAI embeddings. Set it in your environment or "
            "switch `embeddings.provider` to `fake` for local development and tests."
        )
    return OpenAIEmbeddings(model=config.embeddings.model)


def build_llm(config: RagLiftConfig):
    if config.llm.provider == "fake":
        return FakeListChatModel(responses=["This is a fake RagLift answer."])
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError(
            "OPENAI_API_KEY is required for the OpenAI chat model. Set it in your environment "
            "or switch `llm.provider` to `fake` for local development and tests."
        )
    return ChatOpenAI(model=config.llm.model, temperature=0)


def build_vector_store(config: RagLiftConfig, embeddings: Embeddings) -> Chroma:
    return Chroma(
        collection_name=config.vector_store.collection_name,
        embedding_function=embeddings,
        persist_directory=config.vector_store.persist_directory,
    )


def build_retriever(config: RagLiftConfig, embeddings: Embeddings) -> VectorStoreRetriever:
    return build_vector_store(config, embeddings).as_retriever(search_kwargs={"k": 4})

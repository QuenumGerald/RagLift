from pathlib import Path

from typer.testing import CliRunner

from raglift.citations import build_sources
from raglift.cli import app
from raglift.config import load_config
from raglift.graph import RAGGraph
from raglift.ingest import chunk_documents
from raglift.retriever import FakeEmbeddings


def write_config(path: Path) -> None:
    path.write_text(
        '''[embeddings]\nprovider="fake"\n[llm]\nprovider="fake"\n[vector_store]\npersist_directory="{store}"\ncollection_name="test"\n[chunking]\nchunk_size=40\nchunk_overlap=5\n'''.format(store=path.parent / "chroma"),
        encoding="utf-8",
    )


def test_config_loading(tmp_path):
    config_file = tmp_path / "raglift.toml"
    write_config(config_file)
    config = load_config(config_file)
    assert config.embeddings.provider == "fake"
    assert config.chunking.chunk_size == 40


def test_text_markdown_ingestion_and_chunks(tmp_path):
    docs = tmp_path / "docs"
    docs.mkdir()
    (docs / "a.txt").write_text("alpha beta gamma " * 5, encoding="utf-8")
    (docs / "b.md").write_text("# Title\n\nmarkdown content", encoding="utf-8")
    config_file = tmp_path / "raglift.toml"
    write_config(config_file)
    chunks = chunk_documents(docs, load_config(config_file).chunking)
    assert chunks
    assert {Path(chunk.path).suffix for chunk in chunks} == {".txt", ".md"}


def test_ask_flow_and_sources_format(tmp_path):
    docs = tmp_path / "docs"
    docs.mkdir()
    (docs / "guide.md").write_text("RagLift builds LangGraph RAG apps.", encoding="utf-8")
    config_file = tmp_path / "raglift.toml"
    write_config(config_file)
    rag = RAGGraph.from_config(config_file, embeddings=FakeEmbeddings())
    rag.ingest(docs)
    answer = rag.ask("What does RagLift build?")
    assert answer.text
    assert answer.sources[0].path.endswith("guide.md")
    assert answer.sources[0].model_dump().keys() == {"path", "chunk_id", "content_preview"}


def test_build_sources_deduplicates():
    from langchain_core.documents import Document

    docs = [Document(page_content="hello", metadata={"path": "x.md", "chunk_id": "1"})]
    assert build_sources(docs)[0].content_preview == "hello"


def test_cli_init(tmp_path):
    result = CliRunner().invoke(app, ["init", str(tmp_path / "app")])
    assert result.exit_code == 0
    assert (tmp_path / "app" / "raglift.toml").exists()

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
        '''[embeddings]\nprovider="fake"\n[llm]\nprovider="fake"\n[vector_store]\npersist_directory="{store}"\ncollection_name="test"\n[chunking]\nchunk_size=40\nchunk_overlap=5\n'''.format(
            store=path.parent / "chroma"
        ),
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


def test_cli_ingest_and_ask_with_fake_providers(tmp_path):
    app_dir = tmp_path / "app"
    app_dir.mkdir()
    write_config(app_dir / "raglift.toml")
    docs = app_dir / "docs"
    docs.mkdir()
    (docs / "guide.md").write_text("RagLift builds LangGraph RAG apps.", encoding="utf-8")

    runner = CliRunner()
    ingest_result = runner.invoke(
        app,
        ["ingest", str(docs), "--config", str(app_dir / "raglift.toml")],
    )
    ask_result = runner.invoke(
        app,
        ["ask", "What does RagLift build?", "--config", str(app_dir / "raglift.toml")],
    )

    assert ingest_result.exit_code == 0, ingest_result.output
    assert "Ingested" in ingest_result.output
    assert ask_result.exit_code == 0, ask_result.output
    assert "This is a fake RagLift answer." in ask_result.output


def test_missing_config_is_reported(tmp_path):
    result = CliRunner().invoke(app, ["ask", "hello", "--config", str(tmp_path / "missing.toml")])
    assert result.exit_code != 0
    assert "RagLift config not found" in result.output


def test_openai_provider_requires_key(tmp_path, monkeypatch):
    config_file = tmp_path / "raglift.toml"
    config_file.write_text(
        """[embeddings]\nprovider = "openai"\n\n[llm]\nprovider = "openai"\n""",
        encoding="utf-8",
    )
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = CliRunner().invoke(app, ["ask", "hello", "--config", str(config_file)])
    assert result.exit_code != 0
    assert "OPENAI_API_KEY is required" in result.output

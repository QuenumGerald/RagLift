from pathlib import Path

from typer.testing import CliRunner

from raglift.citations import build_sources
from raglift.cli import app
from raglift.config import load_config
from raglift.graph import RAGGraph
from raglift.ingest import IngestError, chunk_documents
from raglift.retriever import FakeEmbeddings
from raglift.schemas import AskResponse


def write_config(path: Path, top_k: int = 4) -> None:
    path.write_text(
        '''[embeddings]
provider="fake"
[llm]
provider="fake"
[vector_store]
persist_directory="{store}"
collection_name="test"
[chunking]
chunk_size=40
chunk_overlap=5
[retrieval]
top_k={top_k}
'''.format(
            store=path.parent / "chroma",
            top_k=top_k,
        ),
        encoding="utf-8",
    )


def test_config_loading(tmp_path):
    config_file = tmp_path / "raglift.toml"
    write_config(config_file, top_k=2)
    config = load_config(config_file)
    assert config.embeddings.provider == "fake"
    assert config.chunking.chunk_size == 40
    assert config.retrieval.top_k == 2


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


def test_fake_providers_work_without_openai_api_key(tmp_path, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    docs = tmp_path / "docs"
    docs.mkdir()
    (docs / "guide.md").write_text("RagLift builds LangGraph RAG apps.", encoding="utf-8")
    config_file = tmp_path / "raglift.toml"
    write_config(config_file)

    rag = RAGGraph.from_config(config_file)
    rag.ingest(docs)
    answer = rag.ask("What does RagLift build?")

    assert answer.text == "This is a fake RagLift answer."
    assert answer.sources


def test_ask_flow_returns_response_and_sources(tmp_path):
    docs = tmp_path / "docs"
    docs.mkdir()
    (docs / "guide.md").write_text("RagLift builds LangGraph RAG apps.", encoding="utf-8")
    config_file = tmp_path / "raglift.toml"
    write_config(config_file)
    rag = RAGGraph.from_config(config_file, embeddings=FakeEmbeddings())
    rag.ingest(docs)
    answer = rag.ask("What does RagLift build?")
    assert isinstance(answer, AskResponse)
    assert answer.text
    assert answer.sources[0].path.endswith("guide.md")
    assert answer.sources[0].model_dump().keys() == {"path", "chunk_id", "content_preview"}


def test_retrieval_top_k_limits_sources(tmp_path):
    docs = tmp_path / "docs"
    docs.mkdir()
    for index in range(3):
        (docs / f"guide-{index}.md").write_text(f"RagLift topic {index}.", encoding="utf-8")
    config_file = tmp_path / "raglift.toml"
    write_config(config_file, top_k=1)
    rag = RAGGraph.from_config(config_file)
    rag.ingest(docs)
    answer = rag.ask("RagLift")
    assert len(answer.sources) == 1


def test_build_sources_deduplicates():
    from langchain_core.documents import Document

    docs = [Document(page_content="hello", metadata={"path": "x.md", "chunk_id": "1"})]
    assert build_sources(docs)[0].content_preview == "hello"


def test_cli_init_creates_expected_files(tmp_path):
    app_dir = tmp_path / "app"
    result = CliRunner().invoke(app, ["init", str(app_dir)])
    assert result.exit_code == 0
    assert (app_dir / "raglift.toml").exists()
    assert (app_dir / "docs").is_dir()
    assert (app_dir / ".env.example").exists()
    assert "[retrieval]" in (app_dir / "raglift.toml").read_text(encoding="utf-8")


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
    assert "guide.md#" in ask_result.output


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


def test_missing_document_path_is_reported(tmp_path):
    config_file = tmp_path / "raglift.toml"
    write_config(config_file)
    result = CliRunner().invoke(
        app, ["ingest", str(tmp_path / "missing"), "--config", str(config_file)]
    )
    assert result.exit_code != 0
    assert "Document path not found" in result.output


def test_empty_docs_folder_reports_no_supported_documents(tmp_path):
    docs = tmp_path / "docs"
    docs.mkdir()
    config_file = tmp_path / "raglift.toml"
    write_config(config_file)
    result = CliRunner().invoke(app, ["ingest", str(docs), "--config", str(config_file)])
    assert result.exit_code != 0
    assert "No supported documents found" in result.output


def test_unsupported_file_reports_no_supported_documents(tmp_path):
    config_file = tmp_path / "raglift.toml"
    write_config(config_file)
    unsupported = tmp_path / "image.png"
    unsupported.write_text("not a doc", encoding="utf-8")
    result = CliRunner().invoke(app, ["ingest", str(unsupported), "--config", str(config_file)])
    assert result.exit_code != 0
    assert "No supported documents found" in result.output


def test_empty_pdf_reports_readable_error(tmp_path):
    pdf = tmp_path / "empty.pdf"
    pdf.write_bytes(b"")
    config_file = tmp_path / "raglift.toml"
    write_config(config_file)
    try:
        chunk_documents(pdf, load_config(config_file).chunking)
    except IngestError as exc:
        assert "PDF could not be read or is empty" in str(exc)
    else:  # pragma: no cover
        raise AssertionError("expected IngestError")

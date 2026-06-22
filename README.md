# RagLift

RagLift is a reusable Python SDK and CLI for building small RAG systems on top of LangChain and LangGraph.

**Primary goal:** provide a simple, installable RAG core that can be reused across projects.

## What RagLift is

- A small Python SDK that wires ingestion, chunking, embeddings, Chroma, LangGraph retrieval, answer generation, and citations.
- A Typer CLI for initializing a reusable RAG project, ingesting documents, and asking questions.
- A minimal v0.1 template for teams that still want an optional full-stack starting point.

## What RagLift is not

RagLift v0.1 is not a hosted platform, agent framework, auth system, dashboard, reranker, multi-tenant service, MCP layer, streaming server, or advanced observability product.

## Installation

```bash
pip install raglift
```

For local development:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -U pip
python -m pip install -e '.[dev]'
```

## Core SDK

The main reusable surface is `RAGGraph` from `raglift.graph`.

```python
from raglift import RAGGraph

rag = RAGGraph.from_config("raglift.toml")
rag.ingest("./docs")
answer = rag.ask("What is this documentation about?")
print(answer.text)
print(answer.sources)
```

## Core CLI

```bash
raglift init my-rag-app
cd my-rag-app
raglift ingest ./docs
raglift ask "What is this documentation about?"
```

`raglift init` creates a reusable local project with:

- `raglift.toml`
- `docs/`
- `.env.example`

## Fake providers

Fake providers are the recommended local workflow for tests, demos, and CI. They do not require `OPENAI_API_KEY`.

Use this config for local development and tests:

```toml
[embeddings]
provider = "fake"

[llm]
provider = "fake"

[vector_store]
persist_directory = ".raglift/chroma"
collection_name = "raglift"

[chunking]
chunk_size = 1000
chunk_overlap = 150
```

Run the test suite locally with:

```bash
python -m pytest
ruff check .
```

## Optional full-stack template

If you want a starter app around the SDK, you can still generate the v0.1 template:

```bash
raglift create my-fullstack-app --frontend angular --backend fastapi
```

That template is secondary to the reusable SDK. It exists as a convenience wrapper, not as the main product surface.

## OpenAI configuration

Create `.env`:

```bash
OPENAI_API_KEY=sk-your-key
RAGLIFT_CONFIG=raglift.toml
```

Default `raglift.toml` uses OpenAI embeddings (`text-embedding-3-small`), OpenAI chat (`gpt-4o-mini`), and Chroma persisted under `.raglift/chroma`.

## v0.1 limitations

- Ingests only `.txt`, `.md`, and `.pdf` files.
- Uses basic recursive character chunking.
- Uses Chroma as the only vector store.
- Uses a simple LangGraph workflow: `START → retrieve → generate_answer → attach_sources → END`.
- No reranker, auth, multi-tenancy, MCP, dashboard, complex agents, streaming, or advanced observability.

## v0.2 roadmap

- Better SDK ergonomics and clearer configuration helpers.
- Optional streaming responses.
- Pluggable vector stores and model providers.
- Evaluation helpers and lightweight tracing.
- More document loaders and metadata controls.

# RagLift

RagLift is a Python SDK, CLI, and full-stack app generator for building RAG applications on top of LangChain and LangGraph.

**Positioning:** Build full-stack LangGraph RAG apps without rebuilding the plumbing.

## What RagLift is

- A small Python SDK that wires ingestion, chunking, embeddings, Chroma, LangGraph retrieval, answer generation, and citations.
- A Typer CLI for initializing, ingesting, asking, serving, and generating apps.
- A v0.1 FastAPI + Angular template for local RAG apps.

## What RagLift is NOT

RagLift v0.1 is not a hosted platform, agent framework, auth system, dashboard, reranker, multi-tenant service, MCP layer, streaming server, or advanced observability product.

## Installation

```bash
pip install raglift
```

For local development:

```bash
pip install -e '.[dev]'
```

## SDK quickstart

```python
from raglift import RAGGraph

rag = RAGGraph.from_config("raglift.toml")
rag.ingest("./docs")
answer = rag.ask("What is this documentation about?")
print(answer.text)
print(answer.sources)
```

## CLI quickstart

```bash
raglift init my-rag-app
cd my-rag-app
raglift ingest ./docs
raglift ask "What is this documentation about?"
raglift serve
```

## Full-stack Angular/FastAPI generation

```bash
raglift create my-fullstack-app --frontend angular --backend fastapi
cd my-fullstack-app
cp .env.example .env
docker compose up --build
```

The generated backend exposes `GET /health`, `POST /api/documents/upload`, `POST /api/documents/ingest`, and `POST /api/chat`. The Angular app includes a chat page, document upload area, sources display, and minimal settings section.

## OpenAI configuration

Create `.env`:

```bash
OPENAI_API_KEY=sk-your-key
RAGLIFT_CONFIG=raglift.toml
```

Default `raglift.toml` uses OpenAI embeddings (`text-embedding-3-small`), OpenAI chat (`gpt-4o-mini`), and Chroma persisted under `.raglift/chroma`.

For tests and demos without a key, set providers to `fake`:

```toml
[embeddings]
provider = "fake"

[llm]
provider = "fake"
```

## v0.1 limitations

- Ingests only `.txt`, `.md`, and `.pdf` files.
- Uses basic recursive character chunking.
- Uses Chroma as the only vector store.
- Uses a simple LangGraph workflow: `START → retrieve → generate_answer → attach_sources → END`.
- No reranker, auth, multi-tenancy, MCP, dashboard, complex agents, streaming, or advanced observability.

## v0.2 roadmap

- More template options and better Angular styling.
- Optional streaming responses.
- Pluggable vector stores and model providers.
- Evaluation helpers and lightweight tracing.
- More document loaders and metadata controls.

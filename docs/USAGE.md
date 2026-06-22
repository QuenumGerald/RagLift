# RagLift Usage Guide

This guide shows the intended v0.1 workflow for the reusable RAG core.

## 1. Install

Create a virtual environment and install the project in editable mode:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -U pip
python -m pip install -e '.[dev]'
```

## 2. Create a project

Use the CLI to scaffold a local RAG project:

```bash
raglift init my-rag-app
cd my-rag-app
```

This creates:

- `raglift.toml`
- `docs/`
- `.env.example`

## 3. Choose providers

### Fake providers for local work

Use fake providers when you want deterministic tests or demos without OpenAI:

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

### OpenAI providers for real data

If you want to use OpenAI, set your key in `.env`:

```bash
OPENAI_API_KEY=sk-your-key
RAGLIFT_CONFIG=raglift.toml
```

Keep the default `provider = "openai"` values in `raglift.toml`.

## 4. Add documents

Place `.txt`, `.md`, or `.pdf` files in `docs/`, then ingest them:

```bash
raglift ingest ./docs --config raglift.toml
```

You can also point `ingest` at a single file.

## 5. Ask questions

Query the indexed documents from the CLI:

```bash
raglift ask "What does this app do?" --config raglift.toml
```

Or call the SDK directly:

```python
from raglift import RAGGraph

rag = RAGGraph.from_config("raglift.toml")
rag.ingest("./docs")
answer = rag.ask("What does this app do?")
print(answer.text)
for source in answer.sources:
    print(source.path, source.chunk_id)
```

## 6. Run checks

Local verification uses the same commands as CI:

```bash
python -m pytest
ruff check .
```

## 7. Troubleshooting

- If `raglift ask` or `raglift ingest` says the config is missing, make sure `raglift.toml` exists or pass `--config`.
- If you are using OpenAI providers and see a missing key error, set `OPENAI_API_KEY` in `.env` or switch both providers to `fake`.
- If you want deterministic behavior in tests, keep both `embeddings.provider` and `llm.provider` set to `fake`.

# RagLift

![RagLift Logo](./RagLift_Logo.png)

RagLift is a small TypeScript CLI and reusable RAG core by Gerald Quenum.

## Install

```bash
npm install
```

## Use

```bash
npx raglift init my-rag-app
cd my-rag-app
cp .env.example .env
npx raglift ingest docs
npx raglift ask "What does this app do?"
```

The generated workspace is intentionally small:

```txt
my-rag-app/
  docs/
  .raglift/
  .env.example
  raglift.toml
  src/raglift/pipeline.ts
```

If you want to customize the pipeline, edit:

- `raglift.toml` for simple config
- `src/raglift/pipeline.ts` for pipeline wiring

## Convention-Based Config

RagLift reads settings from `raglift.toml` first, then `.env`, and uses defaults when nothing is set.

Defaults:

- docs folder: `docs`
- store folder: `.raglift`
- embeddings provider: `fake`
- llm provider: `fake`
- llm model: `gpt-4o-mini`
- vector store: `.raglift/chroma`
- collection: `raglift`

Minimal `raglift.toml`:

```toml
docs = "docs"
store = ".raglift"
provider = "fake"
model = "gpt-4o-mini"
chunk_size = 800
chunk_overlap = 120
top_k = 4
system_prompt = "Answer only from the provided context."
```

If you want to use a real provider, set these variables in `.env`:

- `RAGLIFT_EMBEDDINGS_PROVIDER`
- `RAGLIFT_LLM_PROVIDER`
- `RAGLIFT_LLM_MODEL`
- `RAGLIFT_EMBEDDINGS_BASE_URL`
- `RAGLIFT_LLM_BASE_URL`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `RAGLIFT_LLM_TIMEOUT_MS`

## Provider Examples

OpenAI:

```bash
RAGLIFT_EMBEDDINGS_PROVIDER=openai
RAGLIFT_EMBEDDINGS_BASE_URL=https://api.openai.com/v1
RAGLIFT_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
```

Anthropic:

```bash
RAGLIFT_LLM_PROVIDER=anthropic
RAGLIFT_LLM_MODEL=claude-3-5-sonnet-latest
ANTHROPIC_API_KEY=...
```

OpenRouter:

```bash
RAGLIFT_EMBEDDINGS_PROVIDER=openai
RAGLIFT_EMBEDDINGS_BASE_URL=https://openrouter.ai/api/v1
RAGLIFT_LLM_PROVIDER=openrouter
RAGLIFT_LLM_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
OPENAI_API_KEY=sk-or-v1-...
RAGLIFT_LLM_BASE_URL=https://openrouter.ai/api/v1
```

DeepSeek:

```bash
RAGLIFT_EMBEDDINGS_PROVIDER=openai
RAGLIFT_EMBEDDINGS_BASE_URL=https://api.deepseek.com
RAGLIFT_LLM_PROVIDER=openai
RAGLIFT_LLM_BASE_URL=https://api.deepseek.com
OPENAI_API_KEY=...
```

## Develop

```bash
npm test
npm run check
```

## Notes

- Supported docs: `.txt`, `.md`, `.pdf`
- RagLift loads `.env` automatically from the current directory
- The CLI is intentionally minimal in v0.1

## VS Code Extension

See [docs/VSCODE_EXTENSION.md](docs/VSCODE_EXTENSION.md) for the integration contract and package API.

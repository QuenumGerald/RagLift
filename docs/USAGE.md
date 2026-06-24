# RagLift Usage Guide

![RagLift Logo](../RagLift_Logo.png)

## Install

```bash
npm install
```

## Init

```bash
npx raglift init my-rag-app
cd my-rag-app
cp .env.example .env
```

This creates:

- `docs/`
- `.env.example`
- `raglift.toml`
- `src/raglift/pipeline.ts`

## Configure

Defaults are convention-based and live in `raglift.toml` plus `.env`:

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

To use a real provider, set variables in `.env`.

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

RagLift loads `.env` automatically from the current directory.

If you want to customize the pipeline:

- edit `raglift.toml` for defaults and runtime knobs
- edit `src/raglift/pipeline.ts` for the wiring

## Ingest

Put `.txt`, `.md`, or `.pdf` files in `docs/`, then run:

```bash
npx raglift ingest docs
```

## Ask

```bash
npx raglift ask "What does this project do?"
```

## Run tests

```bash
npm test
```

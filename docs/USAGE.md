# RagLift Usage Guide

## Install

```bash
npm install
```

## Init

```bash
npx raglift init my-rag-app
cd my-rag-app
```

This creates:

- `raglift.json`
- `docs/`
- `.env.example`

## Configure

Use fake providers for local work and tests:

```json
{
  "embeddings": { "provider": "fake" },
  "llm": { "provider": "fake" },
  "vectorStore": {
    "persistDirectory": ".raglift/chroma",
    "collectionName": "raglift"
  }
}
```

## Ingest

Put `.txt` or `.md` files in `docs/`, then run:

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

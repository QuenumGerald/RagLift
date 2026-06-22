# RagLift

RagLift is a small TypeScript CLI and reusable RAG core.

## Install

```bash
npm install
```

## Use

```bash
npx raglift init my-rag-app
cd my-rag-app
npx raglift ingest docs
npx raglift ask "What does this app do?"
```

## Fake providers

The default workflow is fake-only and does not require an OpenAI key.

`raglift.json`:

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

## Develop

```bash
npm test
npm run check
```

## Notes

- Supported docs: `.txt`, `.md`
- The CLI is intentionally minimal in v0.1

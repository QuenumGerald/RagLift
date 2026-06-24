# VS Code Extension Integration

![RagLift Logo](../RagLift_Logo.png)

RagLift is ready to be consumed by a VS Code extension in two ways:

## 1. CLI integration

The extension can call the `raglift` command directly:

```bash
raglift init my-rag-app
raglift ingest docs
raglift ask "What does this project do?"
```

This is the simplest path if you want a command palette command or a task runner.

## 2. Library integration

The extension can import the package API:

```ts
import { askQuestion, chunkDocuments, defaultConfig, ingestChunks } from "raglift";
```

Recommended flow:

```ts
const config = defaultConfig();
const chunks = await chunkDocuments("docs");
await ingestChunks(config, chunks);
const answer = await askQuestion(config, "What does this project do?");
```

## Environment

Put provider settings in `.env`:

- `RAGLIFT_EMBEDDINGS_PROVIDER`
- `RAGLIFT_LLM_PROVIDER`
- `RAGLIFT_LLM_MODEL`
- `RAGLIFT_EMBEDDINGS_BASE_URL`
- `RAGLIFT_LLM_BASE_URL`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

## Notes

- The package exposes a stable TypeScript entrypoint in `src/index.ts`.
- VS Code extensions should bundle the dependency or call the CLI, depending on their architecture.

## Yeoman Generator

If you want a canonical VS Code scaffold, use Node 20+ with `nvm` and run:

```bash
scripts/setup-vscode.sh
```

That script installs Node 20, ensures `yo` and `generator-code` are available, and starts `yo code`.

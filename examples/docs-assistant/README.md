# Docs Assistant Example

![RagLift Logo](./RagLift_Logo.png)

Minimal workspace layout:

```txt
docs-assistant/
  docs/
  raglift.toml
  src/raglift/pipeline.ts
```

Run:

```bash
npm install
raglift ingest docs
raglift ask "What is RagLift?"
```

Edit `raglift.toml` for simple settings and `src/raglift/pipeline.ts` to customize the pipeline.

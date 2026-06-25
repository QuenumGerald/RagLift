# RagLift basic example

Minimal v0.1 example for testing RagLift ingestion, question answering, and citations in a few commands without an OpenAI API key.

```bash
cd examples/basic
raglift ingest ./docs --config raglift.toml
raglift ask "What is RagLift?" --config raglift.toml
```

This example sets both providers to `fake`, so `OPENAI_API_KEY` is not required. The answer text is deterministic and fake, but retrieval still runs against the local Markdown document and prints source citations such as `docs/demo.md#<chunk_id>`.

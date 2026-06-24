#!/usr/bin/env node
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

import { config as loadDotenv } from "dotenv";

import { askQuestion, ingestChunks } from "./retriever.js";
import { chunkDocuments } from "./ingest.js";
import { loadConfig } from "./config.js";

loadDotenv();

const [, , command, ...args] = process.argv;

function usage(): never {
  console.error("Usage: raglift init <name> | ingest <path> | ask <question>");
  process.exit(1);
}

if (!command) usage();

if (command === "init") {
  const name = args[0];
  if (!name) usage();
  mkdirSync(name, { recursive: true });
  mkdirSync(path.join(name, "docs"), { recursive: true });
  mkdirSync(path.join(name, ".raglift"), { recursive: true });
  writeFileSync(
    path.join(name, ".env.example"),
    [
      "RAGLIFT_EMBEDDINGS_PROVIDER=fake",
      "RAGLIFT_LLM_PROVIDER=fake",
      "RAGLIFT_LLM_MODEL=gpt-4o-mini",
      "RAGLIFT_EMBEDDINGS_BASE_URL=",
      "RAGLIFT_LLM_BASE_URL=",
      "OPENAI_API_KEY=",
      "ANTHROPIC_API_KEY=",
      "GEMINI_API_KEY=",
      "RAGLIFT_LLM_TIMEOUT_MS=45000",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(name, "raglift.toml"),
    [
      'docs = "docs"',
      'store = ".raglift"',
      'provider = "fake"',
      'model = "gpt-4o-mini"',
      "chunk_size = 800",
      "chunk_overlap = 120",
      "top_k = 4",
      'system_prompt = "Answer only from the provided context."',
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(name, "docs", "guide.md"),
    "# RagLift\n\nPut your markdown, text files, and PDFs here.\n",
    "utf8",
  );
  writeFileSync(
    path.join(name, "README.md"),
    [
      "# RagLift Workspace",
      "",
      "1. Copy `.env.example` to `.env`.",
      "2. Add documents to `docs/`.",
      "3. Run `raglift ingest docs`.",
      "4. Run `raglift ask \"What does this project do?\"`.",
      "",
    ].join("\n"),
    "utf8",
  );
  console.log(`Initialized ${name}`);
} else if (command === "ingest") {
  const target = args[0];
  if (!target) usage();
  const config = loadConfig();
  const docsPath = target ?? config.docsDir;
  const ids = await ingestChunks(config, await chunkDocuments(docsPath, config));
  console.log(`Ingested ${ids.length} chunks`);
} else if (command === "ask") {
  const question = args[0];
  if (!question) usage();
  const config = loadConfig();
  const answer = await askQuestion(config, question);
  console.log(answer.text);
  for (const source of answer.sources) console.log(`- ${source.path}#${source.chunkId}`);
} else {
  usage();
}

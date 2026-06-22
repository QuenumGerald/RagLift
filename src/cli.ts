#!/usr/bin/env node
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

import { askQuestion, ingestChunks } from "./retriever.js";
import { chunkDocuments } from "./ingest.js";
import { loadConfig, writeDefaultConfig } from "./config.js";

const [, , command, ...args] = process.argv;

function usage(): never {
  console.error("Usage: raglift init <name> | ingest <path> [--config file] | ask <question> [--config file]");
  process.exit(1);
}

function argValue(flag: string): string {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : "raglift.json";
}

if (!command) usage();

if (command === "init") {
  const name = args[0];
  if (!name) usage();
  mkdirSync(name, { recursive: true });
  mkdirSync(path.join(name, "docs"), { recursive: true });
  writeDefaultConfig(path.join(name, "raglift.json"));
  writeFileSync(path.join(name, ".env.example"), "OPENAI_API_KEY=\n", "utf8");
  console.log(`Initialized ${name}`);
} else if (command === "ingest") {
  const target = args[0];
  if (!target) usage();
  const config = loadConfig(argValue("--config"));
  const ids = ingestChunks(config, chunkDocuments(target));
  console.log(`Ingested ${ids.length} chunks`);
} else if (command === "ask") {
  const question = args[0];
  if (!question) usage();
  const config = loadConfig(argValue("--config"));
  const answer = askQuestion(config, question);
  console.log(answer.text);
  for (const source of answer.sources) console.log(`- ${source.path}#${source.chunkId}`);
} else {
  usage();
}

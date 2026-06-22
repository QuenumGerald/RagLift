import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { AskResponse, IngestedChunk, RagLiftConfig, Source } from "./types.js";

function score(text: string, query: string): number {
  const q = query.toLowerCase().split(/\W+/).filter(Boolean);
  const t = text.toLowerCase();
  return q.reduce((acc, term) => acc + (t.includes(term) ? 1 : 0), 0);
}

export function ingestChunks(config: RagLiftConfig, chunks: IngestedChunk[]): string[] {
  const dir = config.vectorStore.persistDirectory;
  mkdirSync(dir, { recursive: true });
  writeFileSync(storePath(config), JSON.stringify(chunks, null, 2), "utf8");
  return chunks.map((chunk) => chunk.id);
}

export function askQuestion(config: RagLiftConfig, question: string): AskResponse {
  const chunks = loadChunks(config);
  const matches = [...chunks].sort((a, b) => score(b.content, question) - score(a.content, question)).slice(0, 4);
  const sources: Source[] = matches.map((chunk) => ({
    path: chunk.path,
    chunkId: chunk.id,
    contentPreview: chunk.content.slice(0, 180).replace(/\n/g, " "),
  }));
  return {
    text: matches.length
      ? "This is a fake RagLift answer."
      : "No indexed documents were found. Ingest documents first.",
    sources,
  };
}

function storePath(config: RagLiftConfig): string {
  return path.join(config.vectorStore.persistDirectory, `${config.vectorStore.collectionName}.json`);
}

function loadChunks(config: RagLiftConfig): IngestedChunk[] {
  const file = storePath(config);
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8")) as IngestedChunk[];
}

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { chunkDocuments } from "../src/ingest.js";
import { loadConfig, writeDefaultConfig } from "../src/config.js";
import { askQuestion, ingestChunks } from "../src/retriever.js";

describe("raglift ts core", () => {
  it("creates and loads config", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "raglift-"));
    const configPath = path.join(dir, "raglift.json");
    writeDefaultConfig(configPath);
    const config = loadConfig(configPath);
    expect(config.embeddings.provider).toBe("fake");
  });

  it("ingests and answers with fake providers", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "raglift-"));
    const docs = path.join(dir, "docs");
    mkdirSync(docs);
    writeFileSync(path.join(docs, "guide.md"), "RagLift builds reusable RAG systems.", "utf8");
    const configPath = path.join(dir, "raglift.json");
    writeDefaultConfig(configPath);
    const config = loadConfig(configPath);
    const chunks = chunkDocuments(docs);
    ingestChunks(config, chunks);
    const answer = askQuestion(config, "What does RagLift build?");
    expect(answer.text).toContain("fake RagLift answer");
    expect(answer.sources.length).toBeGreaterThan(0);
  });
});

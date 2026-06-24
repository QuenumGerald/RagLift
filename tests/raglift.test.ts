import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildSources } from "../src/citations.js";
import { loadConfig, defaultConfig } from "../src/config.js";
import { chunkDocuments } from "../src/ingest.js";
import { askQuestion, ingestChunks } from "../src/retriever.js";

function createTempDocs(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "raglift-"));
  const docs = path.join(dir, "docs");
  mkdirSync(docs);
  writeFileSync(path.join(docs, "guide.md"), "RagLift builds reusable RAG systems.", "utf8");
  writeFileSync(path.join(docs, "notes.txt"), "Notes about testing RagLift.", "utf8");
  return dir;
}

describe("raglift ts core", () => {
  it("loads defaults from env/config", () => {
    const config = loadConfig();
    expect(config.embeddings.provider).toBe("fake");
    expect(defaultConfig().vectorStore.collectionName).toBe("raglift");
    expect(config.docsDir).toBe("docs");
  });

  it("chunks text documents", async () => {
    const dir = createTempDocs();
    const docs = path.join(dir, "docs");
    const chunks = await chunkDocuments(docs);
    expect(chunks).toHaveLength(2);
    expect(chunks.map((chunk) => path.extname(chunk.path)).sort()).toEqual([".md", ".txt"]);
  });

  it("builds sources from documents", () => {
    const docs = [
      { pageContent: "hello", metadata: { path: "a.md", chunk_id: "1" } },
      { pageContent: "hello", metadata: { path: "a.md", chunk_id: "1" } },
      { pageContent: "world", metadata: { path: "b.md", chunk_id: "2" } },
    ];
    const sources = buildSources(docs as never);
    expect(sources).toHaveLength(2);
    expect(sources[0].path).toBe("a.md");
  });

  it("ingests and answers with fake providers", async () => {
    const dir = createTempDocs();
    const docs = path.join(dir, "docs");
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      const config = loadConfig();
      const chunks = await chunkDocuments(docs);
      await ingestChunks(config, chunks);
      const answer = await askQuestion(config, "What does RagLift build?");
      expect(answer.text).toContain("fake RagLift answer");
      expect(answer.sources.length).toBeGreaterThan(0);
    } finally {
      process.chdir(cwd);
    }
  });

  it("cli init creates the local skeleton", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "raglift-"));
    const appDir = path.join(dir, "app");
    const output = execFileSync("./bin/raglift", ["init", appDir], { encoding: "utf8" });
    expect(output).toContain("Initialized");
    expect(existsSync(path.join(appDir, "raglift.toml"))).toBe(true);
  });

  it("rejects unsupported files during chunking", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "raglift-"));
    const docs = path.join(dir, "docs");
    mkdirSync(docs);
    writeFileSync(path.join(docs, "image.png"), "not really an image", "utf8");
    const chunks = await chunkDocuments(docs);
    expect(chunks).toHaveLength(0);
  });
});

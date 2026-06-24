import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import pdf from "pdf-parse";

import type { IngestedChunk, RagLiftConfig } from "./types.js";

const SUPPORTED = new Set([".txt", ".md", ".pdf"]);

function collectFiles(root: string): string[] {
  const stat = statSync(root);
  if (stat.isFile()) return SUPPORTED.has(path.extname(root).toLowerCase()) ? [root] : [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(root, entry.name);
    if (entry.isDirectory()) return collectFiles(resolved);
    return SUPPORTED.has(path.extname(resolved).toLowerCase()) ? [resolved] : [];
  });
}

export async function chunkDocuments(root: string, config?: Pick<RagLiftConfig, "chunkSize" | "chunkOverlap">): Promise<IngestedChunk[]> {
  const files = collectFiles(root);
  const chunks = await Promise.all(
    files.map(async (file) => {
      const content = await readDocument(file);
      return splitIntoChunks(file, content, config);
    }),
  );
  return chunks.flat();
}

async function readDocument(file: string): Promise<string> {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".pdf") {
    const data = readFileSync(file);
    const result = await pdf(data);
    return result.text;
  }
  return readFileSync(file, "utf8");
}

function splitIntoChunks(
  file: string,
  content: string,
  config?: Pick<RagLiftConfig, "chunkSize" | "chunkOverlap">,
): IngestedChunk[] {
  const chunkSize = config?.chunkSize ?? 800;
  const chunkOverlap = Math.min(config?.chunkOverlap ?? 120, chunkSize - 1);
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= chunkSize) {
    return [
      {
        id: createHash("sha1").update(file + normalized).digest("hex").slice(0, 12),
        path: file,
        content: normalized,
      },
    ];
  }

  const chunks: IngestedChunk[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const slice = normalized.slice(start, end);
    chunks.push({
      id: createHash("sha1").update(`${file}:${start}:${slice}`).digest("hex").slice(0, 12),
      path: file,
      content: slice,
    });
    if (end >= normalized.length) break;
    start = Math.max(end - chunkOverlap, start + 1);
  }
  return chunks;
}

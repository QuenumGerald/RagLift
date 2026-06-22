import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import type { IngestedChunk } from "./types.js";

const SUPPORTED = new Set([".txt", ".md"]);

function collectFiles(root: string): string[] {
  const stat = statSync(root);
  if (stat.isFile()) return SUPPORTED.has(path.extname(root).toLowerCase()) ? [root] : [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(root, entry.name);
    if (entry.isDirectory()) return collectFiles(resolved);
    return SUPPORTED.has(path.extname(resolved).toLowerCase()) ? [resolved] : [];
  });
}

export function chunkDocuments(root: string): IngestedChunk[] {
  return collectFiles(root).map((file) => {
    const content = readFileSync(file, "utf8");
    const id = createHash("sha1").update(file + content).digest("hex").slice(0, 12);
    return { id, path: file, content };
  });
}

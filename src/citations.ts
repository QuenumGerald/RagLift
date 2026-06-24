import type { Source } from "./types.js";

type CitationDocument = {
  pageContent: string;
  metadata: Record<string, unknown>;
};

export function buildSources(documents: CitationDocument[], previewChars = 180): Source[] {
  const sources: Source[] = [];
  const seen = new Set<string>();
  for (const doc of documents) {
    const chunkId = String(doc.metadata.chunk_id ?? doc.metadata.chunkId ?? "");
    const path = String(doc.metadata.path ?? doc.metadata.source ?? "");
    const key = `${path}:${chunkId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      path,
      chunkId,
      contentPreview: doc.pageContent.slice(0, previewChars).replace(/\n/g, " "),
    });
  }
  return sources;
}

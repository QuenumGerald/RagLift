import { defaultConfig } from "raglift";

export function createPipeline() {
  const config = defaultConfig();
  return {
    config,
    ingest: {
      docsDir: config.docsDir,
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    },
    retrieval: {
      topK: config.topK,
    },
    prompts: {
      system: config.systemPrompt,
    },
  };
}

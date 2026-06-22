export type Provider = "fake" | "openai";

export interface RagLiftConfig {
  embeddings: { provider: Provider };
  llm: { provider: Provider };
  vectorStore: { persistDirectory: string; collectionName: string };
}

export interface Source {
  path: string;
  chunkId: string;
  contentPreview: string;
}

export interface AskResponse {
  text: string;
  sources: Source[];
}

export interface IngestedChunk {
  id: string;
  path: string;
  content: string;
}

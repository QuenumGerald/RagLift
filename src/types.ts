export type Provider = "fake" | "openai" | "anthropic" | "gemini" | "openrouter";

export interface RagLiftConfig {
  docsDir: string;
  storeDir: string;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  systemPrompt: string;
  embeddings: { provider: Provider; baseUrl?: string };
  llm: { provider: Provider; model?: string; baseUrl?: string };
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
  embedding?: number[];
}

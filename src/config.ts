import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import { parse } from "toml";

import type { RagLiftConfig } from "./types.js";

let envLoaded = false;

export function loadEnvironment(): void {
  if (envLoaded) return;
  loadDotenv();
  envLoaded = true;
}

export function defaultConfig(): RagLiftConfig {
  const projectConfig = loadProjectConfig();
  const embeddingsProvider = (process.env.RAGLIFT_EMBEDDINGS_PROVIDER ??
    projectConfig.provider ??
    "fake") as RagLiftConfig["embeddings"]["provider"];
  const llmProvider = (process.env.RAGLIFT_LLM_PROVIDER ?? projectConfig.provider ?? "fake") as RagLiftConfig["llm"]["provider"];
  return {
    docsDir: projectConfig.docs ?? "docs",
    storeDir: projectConfig.store ?? ".raglift",
    chunkSize: projectConfig.chunk_size ?? 800,
    chunkOverlap: projectConfig.chunk_overlap ?? 120,
    topK: projectConfig.top_k ?? 4,
    systemPrompt: projectConfig.system_prompt ?? "Answer only from the provided context.",
    embeddings: {
      provider: embeddingsProvider,
      baseUrl: process.env.RAGLIFT_EMBEDDINGS_BASE_URL,
    },
    llm: {
      provider: llmProvider,
      model: process.env.RAGLIFT_LLM_MODEL ?? projectConfig.model ?? "gpt-4o-mini",
      baseUrl: process.env.RAGLIFT_LLM_BASE_URL,
    },
    vectorStore: { persistDirectory: `${projectConfig.store ?? ".raglift"}/chroma`, collectionName: "raglift" },
  };
}

export function loadConfig(): RagLiftConfig {
  loadEnvironment();
  return defaultConfig();
}

type ProjectConfig = Partial<
  Pick<RagLiftConfig, "docsDir" | "storeDir" | "chunkSize" | "chunkOverlap" | "topK"> & {
    provider: RagLiftConfig["embeddings"]["provider"];
    model: string;
    system_prompt: string;
    docs: string;
    store: string;
    chunk_size: number;
    chunk_overlap: number;
    top_k: number;
  }
>;

function loadProjectConfig(): ProjectConfig {
  const file = path.join(process.cwd(), "raglift.toml");
  if (!existsSync(file)) return {};
  try {
    return parse(readFileSync(file, "utf8")) as ProjectConfig;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid raglift.toml: ${message}`);
  }
}

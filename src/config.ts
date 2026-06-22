import { readFileSync, existsSync, writeFileSync } from "node:fs";

import type { RagLiftConfig } from "./types.js";

export function defaultConfig(): RagLiftConfig {
  return {
    embeddings: { provider: "fake" },
    llm: { provider: "fake" },
    vectorStore: { persistDirectory: ".raglift/chroma", collectionName: "raglift" },
  };
}

export function loadConfig(path = "raglift.json"): RagLiftConfig {
  if (!existsSync(path)) {
    throw new Error(`RagLift config not found at ${path}. Run \`raglift init <name>\`.`);
  }
  return { ...defaultConfig(), ...JSON.parse(readFileSync(path, "utf8")) };
}

export function writeDefaultConfig(path: string): void {
  writeFileSync(path, JSON.stringify(defaultConfig(), null, 2) + "\n", "utf8");
}

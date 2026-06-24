import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { config as loadDotenv } from "dotenv";
import OpenAI from "openai";

import { loadEnvironment } from "./config.js";
import type { AskResponse, IngestedChunk, RagLiftConfig, Source } from "./types.js";

function score(text: string, query: string): number {
  const q = query.toLowerCase().split(/\W+/).filter(Boolean);
  const t = text.toLowerCase();
  return q.reduce((acc, term) => acc + (t.includes(term) ? 1 : 0), 0);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function requireApiKey(envName: string, provider: string): string {
  loadEnvironment();
  loadDotenv();
  const key = process.env[envName];
  if (!key) {
    throw new Error(`Missing ${envName} for ${provider}. Set it in your environment.`);
  }
  return key;
}

function openAIClient(baseURL?: string): OpenAI {
  return new OpenAI({
    apiKey: requireApiKey("OPENAI_API_KEY", "OpenAI-compatible provider"),
    baseURL,
  });
}

function llmTimeoutMs(): number {
  const value = Number(process.env.RAGLIFT_LLM_TIMEOUT_MS ?? "45000");
  return Number.isFinite(value) && value > 0 ? value : 45000;
}

async function openAIEmbeddingsWithBase(texts: string[], baseURL?: string): Promise<number[][]> {
  try {
    const response = await withTimeout(
      openAIClient(baseURL).embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      }),
      "OpenAI-compatible embeddings",
    );
    return response.data.map((item) => item.embedding);
  } catch (error) {
    throw new Error(friendlyOpenAIError("embeddings", error));
  }
}

async function openAIAnswer(model: string, question: string, context: string): Promise<string> {
  try {
    const response = await openAIClient().chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "Answer using only the provided context. If it is insufficient, say so.",
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0,
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch (error) {
    throw new Error(friendlyOpenAIError("chat", error));
  }
}

async function openAIAnswerWithPrompt(
  model: string,
  question: string,
  context: string,
  systemPrompt: string,
  baseURL?: string,
): Promise<string> {
  try {
    const response = await withTimeout(
      openAIClient(baseURL).chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Context:\n${context}\n\nQuestion: ${question}`,
          },
        ],
        temperature: 0,
      }),
      "OpenAI-compatible chat",
    );
    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch (error) {
    throw new Error(friendlyOpenAIError("chat", error));
  }
}

async function anthropicAnswer(model: string, question: string, context: string): Promise<string> {
  const client = new Anthropic({ apiKey: requireApiKey("ANTHROPIC_API_KEY", "Anthropic") });
  const response = await withTimeout(
    client.messages.create({
      model,
      max_tokens: 1024,
      system: "Answer using only the provided context. If it is insufficient, say so.",
      messages: [{ role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` }],
    }),
    "Anthropic chat",
  );
  return response.content.map((block) => ("text" in block ? block.text : "")).join("").trim();
}

async function geminiAnswer(model: string, question: string, context: string): Promise<string> {
  const client = new GoogleGenAI({ apiKey: requireApiKey("GEMINI_API_KEY", "Gemini") });
  const response = await withTimeout(
    client.models.generateContent({
      model,
      contents: `Context:\n${context}\n\nQuestion: ${question}`,
      config: {
        systemInstruction: "Answer using only the provided context. If it is insufficient, say so.",
        temperature: 0,
      },
    }),
    "Gemini chat",
  );
  return response.text?.trim() ?? "";
}

export async function ingestChunks(config: RagLiftConfig, chunks: IngestedChunk[]): Promise<string[]> {
  const dir = config.vectorStore.persistDirectory;
  mkdirSync(dir, { recursive: true });
  if (config.embeddings.provider === "openai") {
    const embeddings = await openAIEmbeddingsWithBase(chunks.map((chunk) => chunk.content), config.embeddings.baseUrl);
    chunks = chunks.map((chunk, index) => ({ ...chunk, embedding: embeddings[index] }));
  }
  writeFileSync(storePath(config), JSON.stringify(chunks, null, 2), "utf8");
  return chunks.map((chunk) => chunk.id);
}

export async function askQuestion(config: RagLiftConfig, question: string): Promise<AskResponse> {
  const chunks = loadChunks(config);
  let ranked = [...chunks];
  if (config.embeddings.provider === "openai") {
    const [queryEmbedding] = await openAIEmbeddingsWithBase([question], config.embeddings.baseUrl);
    ranked = ranked
      .map((chunk) => ({
        chunk,
        similarity: chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ chunk }) => chunk);
  } else {
    ranked = ranked.sort((a, b) => score(b.content, question) - score(a.content, question));
  }
  const matches = ranked.slice(0, config.topK);
  const sources: Source[] = matches.map((chunk) => ({
    path: chunk.path,
    chunkId: chunk.id,
    contentPreview: chunk.content.slice(0, 180).replace(/\n/g, " "),
  }));
  const context = matches.map((chunk) => `Source: ${chunk.path}#${chunk.id}\n${chunk.content}`).join("\n\n");
  if (config.llm.provider === "openai" || config.llm.provider === "openrouter") {
    const model = config.llm.model ?? "gpt-4o-mini";
    const baseURL =
      config.llm.baseUrl ?? (config.llm.provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined);
    return { text: await openAIAnswerWithPrompt(model, question, context, config.systemPrompt, baseURL), sources };
  }
  if (config.llm.provider === "anthropic") {
    return {
      text: await anthropicAnswer(config.llm.model ?? "claude-3-5-sonnet-latest", question, context),
      sources,
    };
  }
  if (config.llm.provider === "gemini") {
    return {
      text: await geminiAnswer(config.llm.model ?? "gemini-2.0-flash", question, context),
      sources,
    };
  }
  return {
    text: matches.length
      ? "This is a fake RagLift answer."
      : "No indexed documents were found. Ingest documents first.",
    sources,
  };
}

function storePath(config: RagLiftConfig): string {
  return path.join(config.vectorStore.persistDirectory, `${config.vectorStore.collectionName}.json`);
}

function loadChunks(config: RagLiftConfig): IngestedChunk[] {
  const file = storePath(config);
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8")) as IngestedChunk[];
}

function friendlyOpenAIError(operation: "embeddings" | "chat", error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `OpenAI ${operation} request failed. Check your key and network connection. Details: ${message}`;
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  const timeoutMs = llmTimeoutMs();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

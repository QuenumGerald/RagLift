import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const commands = new Map<string, () => unknown>();
const subscriptions: unknown[] = [];
const workspaceRoot = mkdtempSync(path.join(os.tmpdir(), "raglift-vscode-workspace-"));
const createWebviewPanel = vi.fn(() => ({
  webview: {
    cspSource: "vscode-resource",
    html: "",
    onDidReceiveMessage: vi.fn(),
    postMessage: vi.fn(),
  },
}));

vi.mock("vscode", () => ({
  commands: {
    registerCommand: vi.fn((name: string, callback: () => unknown) => {
      commands.set(name, callback);
      return { dispose: vi.fn() };
    }),
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: workspaceRoot } }],
  },
  window: { createWebviewPanel },
  ViewColumn: { One: 1 },
}));

vi.mock("raglift", () => ({
  askQuestion: vi.fn(),
  chunkDocuments: vi.fn(),
  defaultConfig: vi.fn(() => {
    const file = path.join(process.cwd(), "raglift.toml");
    if (!existsSync(file)) {
      return { docsDir: "docs", storeDir: ".raglift", topK: 4 };
    }
    const raw = readFileSync(file, "utf8");
    const docsMatch = raw.match(/^docs\s*=\s*"([^"]+)"/m);
    const storeMatch = raw.match(/^store\s*=\s*"([^"]+)"/m);
    const topKMatch = raw.match(/^top_k\s*=\s*(\d+)/m);
    return {
      docsDir: docsMatch?.[1] ?? "docs",
      storeDir: storeMatch?.[1] ?? ".raglift",
      topK: topKMatch ? Number(topKMatch[1]) : 4,
    };
  }),
  ingestChunks: vi.fn(),
}));

describe("RagLift extension", () => {
  afterEach(() => {
    commands.clear();
    subscriptions.length = 0;
    vi.clearAllMocks();
  });

  it("registers the extension commands", async () => {
    const { activate } = await import("../src/extension.js");
    activate({ subscriptions } as never);

    expect(commands.has("raglift.open")).toBe(true);
    expect(commands.has("raglift.ask")).toBe(true);
  });

  it("creates a workspace bootstrap for init", async () => {
    const { writeWorkspaceBootstrap } = await import("../src/extension.js");
    const message = writeWorkspaceBootstrap("/tmp/raglift-test");

    expect(message).toContain("Initialized RagLift workspace");
  });

  it("requires a workspace root", async () => {
    const { requireWorkspaceRoot } = await import("../src/extension.js");
    expect(requireWorkspaceRoot()).toBe(workspaceRoot);
  });

  it("renders a webview panel", async () => {
    const { activate } = await import("../src/extension.js");
    activate({ subscriptions } as never);
    await commands.get("raglift.open")?.();
    expect(createWebviewPanel).toHaveBeenCalled();
  });

  it("opens the pipeline scaffold from the webview", async () => {
    const { createCommandHandlers } = await import("../src/extension.js");
    const dir = mkdtempSync(path.join(os.tmpdir(), "raglift-open-pipeline-"));
    writeFileSync(path.join(dir, "raglift.toml"), 'docs = "docs"\n', "utf8");
    mkdirSync(path.join(dir, "src", "raglift"), { recursive: true });
    writeFileSync(path.join(dir, "src", "raglift", "pipeline.ts"), "export {};\n", "utf8");
    const handlers = createCommandHandlers();
    const { config, restore } = handlers.loadWorkspaceConfig(dir);
    try {
      expect(config.docsDir).toBe("docs");
    } finally {
      restore();
    }
  });

  it("exposes the workspace bootstrap helper", async () => {
    const { createCommandHandlers } = await import("../src/extension.js");
    const handlers = createCommandHandlers();
    expect(handlers.writeWorkspaceBootstrap("/tmp/raglift-test")).toContain("Initialized RagLift workspace");
  });

  it("creates a pipeline scaffold during init", async () => {
    const { createCommandHandlers } = await import("../src/extension.js");
    const dir = mkdtempSync(path.join(os.tmpdir(), "raglift-init-"));
    const handlers = createCommandHandlers();
    const message = handlers.writeWorkspaceBootstrap(dir);
    expect(message).toContain("Initialized RagLift workspace");
    expect(existsSync(path.join(dir, "src", "raglift", "pipeline.ts"))).toBe(true);
    expect(readFileSync(path.join(dir, "src", "raglift", "pipeline.ts"), "utf8")).toContain("createPipeline");
  });

  it("loads config from the opened workspace", async () => {
    const { createCommandHandlers } = await import("../src/extension.js");
    const dir = mkdtempSync(path.join(os.tmpdir(), "raglift-ext-"));
    writeFileSync(
      path.join(dir, "raglift.toml"),
      ['docs = "content"', 'store = ".cache"', 'provider = "fake"', 'top_k = 2', ""].join("\n"),
      "utf8",
    );
    const handlers = createCommandHandlers();
    const { config, restore } = handlers.loadWorkspaceConfig(dir);
    try {
      expect(config.docsDir).toBe("content");
      expect(config.topK).toBe(2);
      expect(config.storeDir).toBe(".cache");
    } finally {
      restore();
    }
  });
});

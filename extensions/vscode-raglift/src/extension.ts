import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import * as vscode from "vscode";

import { askQuestion, chunkDocuments, defaultConfig, ingestChunks } from "raglift";

type WorkspaceRoot = string;

function requireWorkspaceRoot(): WorkspaceRoot {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    throw new Error("Open a folder in VS Code first.");
  }
  return workspaceRoot;
}

function writeWorkspaceBootstrap(workspaceRoot: WorkspaceRoot): string {
  mkdirSync(path.join(workspaceRoot, "docs"), { recursive: true });
  mkdirSync(path.join(workspaceRoot, ".raglift"), { recursive: true });
  mkdirSync(path.join(workspaceRoot, "src", "raglift"), { recursive: true });
  writeFileSync(
    path.join(workspaceRoot, ".env.example"),
    [
      "RAGLIFT_EMBEDDINGS_PROVIDER=fake",
      "RAGLIFT_LLM_PROVIDER=fake",
      "RAGLIFT_LLM_MODEL=gpt-4o-mini",
      "RAGLIFT_EMBEDDINGS_BASE_URL=",
      "RAGLIFT_LLM_BASE_URL=",
      "OPENAI_API_KEY=",
      "ANTHROPIC_API_KEY=",
      "GEMINI_API_KEY=",
      "RAGLIFT_LLM_TIMEOUT_MS=45000",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(workspaceRoot, "raglift.toml"),
    [
      'docs = "docs"',
      'store = ".raglift"',
      'provider = "fake"',
      'model = "gpt-4o-mini"',
      "chunk_size = 800",
      "chunk_overlap = 120",
      "top_k = 4",
      'system_prompt = "Answer only from the provided context."',
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(workspaceRoot, "docs", "guide.md"),
    "# RagLift\n\nPut markdown, text files, and PDFs in this folder.\n",
    "utf8",
  );
  writeFileSync(
    path.join(workspaceRoot, "README.md"),
    [
      "# RagLift Workspace",
      "",
      "1. Copy `.env.example` to `.env`.",
      "2. Edit `raglift.toml` if you want to change docs, chunking, or prompt settings.",
      "3. Edit `src/raglift/pipeline.ts` if you want to customize the pipeline.",
      "4. The pipeline file is the place to wire ingestion, retrieval, and prompts together.",
      "5. Add files to `docs/`.",
      "6. Run `raglift ingest docs`.",
      "7. Run `raglift ask \"What does this project do?\"`.",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(workspaceRoot, "src", "raglift", "pipeline.ts"),
    [
      'import { defaultConfig } from "raglift";',
      "",
      "export function createPipeline() {",
      "  const config = defaultConfig();",
      "  return {",
      "    config,",
      "    ingest: {",
      "      docsDir: config.docsDir,",
      "      chunkSize: config.chunkSize,",
      "      chunkOverlap: config.chunkOverlap,",
      "    },",
      "    retrieval: {",
      "      topK: config.topK,",
      "    },",
      "    prompts: {",
      "      system: config.systemPrompt,",
      "    },",
      "  };",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  return `Initialized RagLift workspace at ${workspaceRoot}`;
}

async function ingestWorkspace(workspaceRoot: WorkspaceRoot): Promise<string> {
  const { config, restore } = loadWorkspaceConfig(workspaceRoot);
  try {
    const docs = await chunkDocuments(path.join(workspaceRoot, config.docsDir));
    const ids = await ingestChunks(config, docs);
    return `Ingested ${ids.length} chunks`;
  } finally {
    restore();
  }
}

async function askWorkspace(workspaceRoot: WorkspaceRoot, question: string): Promise<string> {
  const { config, restore } = loadWorkspaceConfig(workspaceRoot);
  try {
    const answer = await askQuestion(config, question);
    return [
      answer.text,
      "",
      ...answer.sources.map((source) => `${source.path}#${source.chunkId}`),
    ].join("\n");
  } finally {
    restore();
  }
}

function loadWorkspaceConfig(workspaceRoot: WorkspaceRoot): { config: ReturnType<typeof defaultConfig>; restore: () => void } {
  const previousCwd = process.cwd();
  process.chdir(workspaceRoot);
  return {
    config: defaultConfig(),
    restore: () => process.chdir(previousCwd),
  };
}

function htmlEscape(value: string | number | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderPanel(webview: vscode.Webview, workspaceRoot: string, config: ReturnType<typeof defaultConfig>): string {
  const csp = webview.cspSource;
  return /* html */ `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp} 'unsafe-inline'; script-src 'nonce-raglift';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { font-family: sans-serif; padding: 16px; color: #1f2937; }
      input, button, textarea { width: 100%; margin: 8px 0; padding: 10px; box-sizing: border-box; }
      textarea { min-height: 140px; }
      .card { border: 1px solid #ddd; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
      .muted { color: #6b7280; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="card">
      <strong>RagLift</strong>
      <div class="muted">${htmlEscape(workspaceRoot)}</div>
      <div class="muted">docs: ${htmlEscape(config.docsDir)} | store: ${htmlEscape(config.storeDir)} | chunk_size: ${config.chunkSize} | chunk_overlap: ${config.chunkOverlap} | top_k: ${config.topK}</div>
      <div class="muted">system_prompt: ${htmlEscape(config.systemPrompt)}</div>
      <button id="init">Init workspace</button>
      <button id="ingest">Ingest docs</button>
      <button id="open-config">Open raglift.toml</button>
      <button id="open-pipeline">Open pipeline.ts</button>
    </div>
    <div class="card">
      <input id="question" placeholder="Ask a question" />
      <button id="ask">Ask</button>
    </div>
    <div class="card">
      <textarea id="output" readonly placeholder="Results appear here"></textarea>
    </div>
    <script nonce="raglift">
      const vscode = acquireVsCodeApi();
      const output = document.getElementById('output');
      document.getElementById('init').addEventListener('click', () => vscode.postMessage({ type: 'init' }));
      document.getElementById('ingest').addEventListener('click', () => vscode.postMessage({ type: 'ingest' }));
      document.getElementById('open-config').addEventListener('click', () => vscode.postMessage({ type: 'open-config' }));
      document.getElementById('open-pipeline').addEventListener('click', () => vscode.postMessage({ type: 'open-pipeline' }));
      document.getElementById('ask').addEventListener('click', () => {
        vscode.postMessage({ type: 'ask', question: document.getElementById('question').value });
      });
      window.addEventListener('message', (event) => { output.value = event.data.text; });
    </script>
  </body>
  </html>`;
}

export function createCommandHandlers() {
  return { writeWorkspaceBootstrap, ingestWorkspace, askWorkspace, requireWorkspaceRoot, renderPanel, loadWorkspaceConfig };
}

export function activate(context: vscode.ExtensionContext): void {
  const open = () => {
    const workspaceRoot = requireWorkspaceRoot();
    const { config, restore } = loadWorkspaceConfig(workspaceRoot);
    const panel = vscode.window.createWebviewPanel("raglift", "RagLift", vscode.ViewColumn.One, {
      enableScripts: true,
    });
    panel.webview.html = renderPanel(panel.webview, workspaceRoot, config);
    restore();
    panel.webview.onDidReceiveMessage(async (message) => {
      try {
        let text = "";
        if (message.type === "init") {
          text = writeWorkspaceBootstrap(workspaceRoot);
        } else if (message.type === "ingest") {
          text = await ingestWorkspace(workspaceRoot);
        } else if (message.type === "ask") {
          const question = String(message.question ?? "").trim();
          if (!question) {
            throw new Error("Enter a question first.");
          }
          text = await askWorkspace(workspaceRoot, question);
        } else if (message.type === "open-config") {
          const configUri = vscode.Uri.file(path.join(workspaceRoot, "raglift.toml"));
          await vscode.window.showTextDocument(configUri);
          text = "Opened raglift.toml";
        } else if (message.type === "open-pipeline") {
          const pipelineUri = vscode.Uri.file(path.join(workspaceRoot, "src", "raglift", "pipeline.ts"));
          await vscode.window.showTextDocument(pipelineUri);
          text = "Opened src/raglift/pipeline.ts";
        }
        panel.webview.postMessage({ text });
      } catch (error) {
        panel.webview.postMessage({ text: error instanceof Error ? error.message : String(error) });
      }
    });
    return panel;
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("raglift.open", open),
    vscode.commands.registerCommand("raglift.ask", async () => {
      const panel = open();
      panel.webview.postMessage({ text: "Use the input above to ask questions." });
    }),
  );
}

export function deactivate(): void {}

export { askWorkspace, ingestWorkspace, requireWorkspaceRoot, writeWorkspaceBootstrap, renderPanel };

import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import http from "node:http";
import { homedir } from "node:os";
import path from "node:path";
import { type ExtensionContext, window, workspace } from "vscode";
import type { CoreRuntimeInfo } from "./core-installer";
import { ensureCoreInstalled } from "./core-installer";

const DEFAULT_CORE_HOST = "127.0.0.1";
const DEFAULT_CORE_PORT = 8080;
const HEALTH_PATH = "/api/v1/health";
const HEALTH_TIMEOUT_MS = 1000;
const HTTP_STATUS_OK = 200;

const resolveCoreLogFilePath = (): string => {
  const logDir = path.join(homedir(), ".codeai-hub", "logs", "core");
  try {
    mkdirSync(logDir, { recursive: true });
  } catch {
    // ignore directory creation failures; logging will fall back to stdout
  }
  return path.join(logDir, "core.log");
};

export const CORE_HOST = process.env.CODEAI_CORE_HOST ?? DEFAULT_CORE_HOST;
export const CORE_PORT = Number(
  process.env.CODEAI_CORE_PORT ?? DEFAULT_CORE_PORT
);

const createConnectionUrls = () => ({
  httpUrl: `http://${CORE_HOST}:${CORE_PORT}`,
  wsUrl: `ws://${CORE_HOST}:${CORE_PORT}/api/v1/stream`,
});

export type CoreConnectionInfo = ReturnType<typeof createConnectionUrls>;

export const getDefaultCoreConnectionInfo = (): CoreConnectionInfo =>
  createConnectionUrls();

export class CoreProcessManager {
  private child: ChildProcessWithoutNullStreams | null = null;

  private runtimeInfo: CoreRuntimeInfo | null = null;

  private readonly channel = window.createOutputChannel("CodeAI Hub Core");

  private readonly context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.context = context;
  }

  async ensureStarted(runtimeInfo?: CoreRuntimeInfo): Promise<void> {
    if (runtimeInfo) {
      this.runtimeInfo = runtimeInfo;
    } else if (!this.runtimeInfo) {
      this.runtimeInfo = await ensureCoreInstalled(this.context);
    }

    if (await this.isCoreHealthy()) {
      this.channel.appendLine("CodeAI Hub core already running.");
      return;
    }

    this.launch();
  }

  getConnectionInfo(): CoreConnectionInfo {
    return createConnectionUrls();
  }

  private launch(): void {
    if (this.child || !this.runtimeInfo) {
      return;
    }

    this.channel.appendLine("Starting CodeAI Hub core orchestrator...");
    const workspacePath = this.resolveWorkspacePath();
    const claudeModulePath = this.resolveProviderModulePath("claude");
    const codexModulePath = this.resolveProviderModulePath("codex");
    const geminiModulePath = this.resolveProviderModulePath("gemini");
    const envVars: NodeJS.ProcessEnv = {
      ...process.env,
      CORE_HOST,
      CORE_PORT: `${CORE_PORT}`,
      CORE_MANAGED_MODE: "vscode",
      CLAUDE_WORKSPACE_PATH: workspacePath,
      CODEX_WORKSPACE_PATH: workspacePath,
      CODEX_SKIP_GIT_REPO_CHECK: "true",
      CODEAI_HUB_RUNTIME_DIR: this.runtimeInfo.runtimeDir,
      CODEAI_HUB_APP_DIR: path.join(this.runtimeInfo.runtimeDir, "app"),
    };
    if (!envVars.NODE_ENV) {
      envVars.NODE_ENV = "production";
    }
    if (claudeModulePath) {
      envVars.CLAUDE_MODULE_PATH = claudeModulePath;
    }
    if (codexModulePath) {
      envVars.CODEX_MODULE_PATH = codexModulePath;
    }
    if (geminiModulePath) {
      envVars.GEMINI_MODULE_PATH = geminiModulePath;
    }
    envVars.CODEAI_CORE_LOG_FILE = resolveCoreLogFilePath();
    const appCwd = path.join(this.runtimeInfo.runtimeDir, "app");
    this.child = spawn(
      this.runtimeInfo.nodePath,
      [this.runtimeInfo.entryPoint],
      {
        env: envVars,
        stdio: "pipe",
        cwd: appCwd,
      }
    );

    this.child.stdout.on("data", (chunk) => {
      this.channel.append(chunk.toString());
    });

    this.child.stderr.on("data", (chunk) => {
      this.channel.append(chunk.toString());
    });

    this.child.on("exit", (code) => {
      this.child = null;
      this.channel.appendLine(
        `Core orchestrator exited with code ${code ?? 0}.`
      );
    });
  }

  private async isCoreHealthy(): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      const request = http
        .get(
          {
            host: CORE_HOST,
            port: CORE_PORT,
            path: HEALTH_PATH,
            timeout: HEALTH_TIMEOUT_MS,
          },
          (response) => {
            response.resume();
            resolve(response.statusCode === HTTP_STATUS_OK);
          }
        )
        .on("error", () => resolve(false));

      request.on("timeout", () => {
        request.destroy();
        resolve(false);
      });
    });
  }

  dispose(): void {
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
    this.channel.dispose();
  }

  private resolveWorkspacePath(): string {
    const folder = workspace.workspaceFolders?.[0];
    if (folder) {
      return folder.uri.fsPath;
    }
    return process.cwd();
  }

  private resolveProviderModulePath(providerId: string): string | null {
    const root = path.join(homedir(), ".codeai-hub", "providers", providerId);
    try {
      const latestPath = path.join(root, "latest");
      if (!existsSync(latestPath)) {
        return null;
      }
      const version = readFileSync(latestPath, "utf8").trim();
      if (!version) {
        return null;
      }
      const candidate = path.join(root, version);
      if (existsSync(candidate)) {
        return candidate;
      }
    } catch {
      return null;
    }
    return null;
  }
}

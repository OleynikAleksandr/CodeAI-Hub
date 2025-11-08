import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { type ExtensionContext, window, workspace } from "vscode";
import { recordCorePortPreference } from "../runtime/runtime-registry";
import type { CoreRuntimeInfo } from "./core-installer";
import { ensureCoreInstalled } from "./core-installer";
import { CoreManagerLock } from "./core-manager-lock";
import { CorePortManager } from "./core-port-manager";

const DEFAULT_CORE_HOST = "127.0.0.1";
const DEFAULT_CORE_PORT = 8080;

const resolveCoreLogFilePath = (): string => {
  const logDir = path.join(homedir(), ".codeai-hub", "logs", "core");
  try {
    mkdirSync(logDir, { recursive: true });
  } catch {
    // ignore directory creation failures; logging will fall back to stdout
  }
  return path.join(logDir, "core.log");
};

const CORE_HOST = process.env.CODEAI_CORE_HOST ?? DEFAULT_CORE_HOST;
const ENV_CORE_PORT = Number(process.env.CODEAI_CORE_PORT ?? DEFAULT_CORE_PORT);

const createConnectionUrls = (port: number, host = CORE_HOST) => ({
  httpUrl: `http://${host}:${port}`,
  wsUrl: `ws://${host}:${port}/api/v1/stream`,
});

export type CoreConnectionInfo = ReturnType<typeof createConnectionUrls>;

export const getDefaultCoreConnectionInfo = (): CoreConnectionInfo =>
  createConnectionUrls(ENV_CORE_PORT);

type ConnectionListener = (info: CoreConnectionInfo) => void;
type VoidListener = () => void;

export class CoreProcessManager {
  private child: ChildProcessWithoutNullStreams | null = null;

  private runtimeInfo: CoreRuntimeInfo | null = null;

  private readonly channel = window.createOutputChannel("CodeAI Hub Core");

  private readonly context: ExtensionContext;

  private readonly managerLock = new CoreManagerLock("vscode-extension");

  private readonly host = CORE_HOST;

  private readonly envPort: number;

  private currentPort: number;

  private connectionInfo: CoreConnectionInfo;

  private readonly portManager: CorePortManager;

  private readonly connectionListeners = new Set<ConnectionListener>();

  private readonly exitListeners = new Set<VoidListener>();

  constructor(context: ExtensionContext) {
    this.context = context;
    this.envPort = Number.isFinite(ENV_CORE_PORT)
      ? ENV_CORE_PORT
      : DEFAULT_CORE_PORT;
    this.currentPort = this.envPort;
    this.connectionInfo = createConnectionUrls(this.currentPort, this.host);
    this.portManager = new CorePortManager({
      host: this.host,
      envPort: this.envPort,
      channel: this.channel,
    });
  }

  async ensureStarted(runtimeInfo?: CoreRuntimeInfo): Promise<void> {
    if (runtimeInfo) {
      this.runtimeInfo = runtimeInfo;
    } else if (!this.runtimeInfo) {
      this.runtimeInfo = await ensureCoreInstalled(this.context);
    }
    if (!this.runtimeInfo) {
      throw new Error("Unable to resolve CodeAI Hub core runtime information.");
    }

    const decision = await this.portManager.resolve(
      this.runtimeInfo.version,
      this.currentPort
    );
    if (decision.kind === "running") {
      this.updateConnectionInfo(decision.port);
      this.channel.appendLine("CodeAI Hub core already running.");
      return;
    }

    this.updateConnectionInfo(decision.port);
    this.channel.appendLine(
      `Preparing to launch CodeAI Hub core on port ${decision.port}...`
    );

    const acquisition = this.managerLock.acquire();
    if (!acquisition.acquired) {
      const owner = acquisition.owner ?? "another manager";
      this.channel.appendLine(
        `CodeAI Hub core is managed by ${owner}, skipping local launch.`
      );
      return;
    }

    this.launch();
  }

  getConnectionInfo(): CoreConnectionInfo {
    return this.connectionInfo;
  }

  onConnectionInfoChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.connectionInfo);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  onProcessExit(listener: VoidListener): () => void {
    this.exitListeners.add(listener);
    return () => {
      this.exitListeners.delete(listener);
    };
  }

  private updateConnectionInfo(port: number): void {
    if (this.currentPort === port) {
      return;
    }
    this.currentPort = port;
    this.connectionInfo = createConnectionUrls(port, this.host);
    this.notifyConnectionInfoChange();
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
      CORE_HOST: this.host,
      CORE_PORT: `${this.currentPort}`,
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
    try {
      this.child = spawn(
        this.runtimeInfo.nodePath,
        [this.runtimeInfo.entryPoint],
        {
          env: envVars,
          stdio: "pipe",
          cwd: appCwd,
        }
      );
    } catch (error) {
      this.managerLock.release();
      throw error;
    }
    recordCorePortPreference(this.currentPort).catch((error) => {
      this.channel.appendLine(
        `Failed to record core port preference: ${
          error instanceof Error ? error.message : String(error)
        }.`
      );
    });

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
      this.managerLock.release();
      this.notifyProcessExit();
    });
  }

  dispose(): void {
    if (this.child) {
      this.child.stdout?.removeAllListeners("data");
      this.child.stderr?.removeAllListeners("data");
      this.child.unref?.();
      this.child = null;
    }
    this.managerLock.release();
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

  private notifyConnectionInfoChange(): void {
    for (const listener of this.connectionListeners) {
      try {
        listener(this.connectionInfo);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.channel.appendLine(
          `Connection listener failed: ${reason ?? "unknown error"}.`
        );
      }
    }
  }

  private notifyProcessExit(): void {
    for (const listener of this.exitListeners) {
      try {
        listener();
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.channel.appendLine(
          `Process exit listener failed: ${reason ?? "unknown error"}.`
        );
      }
    }
  }
}

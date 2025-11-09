import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path from "node:path";
import { type ExtensionContext, window } from "vscode";
import { recordCorePortPreference } from "../runtime/runtime-registry";
import {
  CORE_HOST,
  type CoreConnectionInfo,
  createConnectionUrls,
  DEFAULT_CORE_PORT,
  ENV_CORE_PORT,
} from "./core-connection-info";
import { type CoreRuntimeInfo, ensureCoreInstalled } from "./core-installer";
import { resolveCoreLogFilePath } from "./core-log-path";
import { CoreManagerLock } from "./core-manager-lock";
import { CorePortManager, type RunningCoreInfo } from "./core-port-manager";
import {
  notifyConnectionListeners,
  notifyExitListeners,
} from "./core-process-notifiers";
import {
  resolveProviderModulePath,
  resolveWorkspacePath,
} from "./core-workspace";

type EnsureStartedOptions = {
  readonly forceRestart?: boolean;
  readonly targetVersion?: string;
};
export class CoreProcessManager {
  private child: ChildProcessWithoutNullStreams | null = null;
  private runtimeInfo: CoreRuntimeInfo | null = null;
  private declaredVersion?: string;
  private readonly channel = window.createOutputChannel("CodeAI Hub Core");
  private readonly context: ExtensionContext;
  private readonly managerLock = new CoreManagerLock("vscode-extension");
  private readonly host = CORE_HOST;
  private readonly envPort: number;
  private currentPort: number;
  private connectionInfo: CoreConnectionInfo;
  private readonly portManager: CorePortManager;
  private readonly connectionListeners = new Set<
    (info: CoreConnectionInfo) => void
  >();
  private readonly exitListeners = new Set<() => void>();
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
  async ensureStarted(
    runtimeInfo?: CoreRuntimeInfo,
    options?: EnsureStartedOptions
  ): Promise<void> {
    let runtime = runtimeInfo ?? this.runtimeInfo ?? null;
    let targetVersion =
      options?.targetVersion ?? this.declaredVersion ?? runtime?.version;
    if (!targetVersion) {
      runtime = await this.ensureRuntimeInfo(runtimeInfo);
      targetVersion = runtime.version;
    }
    this.declaredVersion = targetVersion;
    if (!options?.forceRestart) {
      const attached = await this.tryAttachToRunningCore(targetVersion);
      if (attached) {
        return;
      }
    }
    const resolvedRuntime =
      runtime ?? (await this.ensureRuntimeInfo(runtimeInfo));
    this.declaredVersion = resolvedRuntime.version;
    const decision = await this.portManager.resolve(
      resolvedRuntime.version,
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
  setDeclaredVersion(version: string): void {
    this.declaredVersion = version;
  }
  attachToRunningCore(targetVersion?: string): Promise<boolean> {
    const version =
      targetVersion ?? this.declaredVersion ?? this.runtimeInfo?.version;
    if (!version) {
      return Promise.resolve(false);
    }
    this.declaredVersion = version;
    return this.tryAttachToRunningCore(version);
  }
  getConnectionInfo(): CoreConnectionInfo {
    return this.connectionInfo;
  }
  onConnectionInfoChange(
    listener: (info: CoreConnectionInfo) => void
  ): () => void {
    this.connectionListeners.add(listener);
    listener(this.connectionInfo);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }
  onProcessExit(listener: () => void): () => void {
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
    notifyConnectionListeners(
      this.connectionListeners,
      this.connectionInfo,
      this.channel
    );
  }
  private async ensureRuntimeInfo(
    runtimeInfo?: CoreRuntimeInfo
  ): Promise<CoreRuntimeInfo> {
    if (runtimeInfo) {
      this.runtimeInfo = runtimeInfo;
      this.declaredVersion = runtimeInfo.version;
      return runtimeInfo;
    }
    if (!this.runtimeInfo) {
      this.runtimeInfo = await ensureCoreInstalled(this.context);
      if (this.runtimeInfo) {
        this.declaredVersion = this.runtimeInfo.version;
      }
    }
    if (!this.runtimeInfo) {
      throw new Error("Unable to resolve CodeAI Hub core runtime information.");
    }
    return this.runtimeInfo;
  }
  private async tryAttachToRunningCore(
    targetVersion: string
  ): Promise<boolean> {
    const running = await this.detectRunningCore(targetVersion);
    if (!running) {
      return false;
    }
    if (running.kind === "match") {
      this.channel.appendLine("CodeAI Hub core already running.");
      return true;
    }
    await this.handleDetectedMismatch(running);
    return false;
  }
  private async detectRunningCore(
    targetVersion: string
  ): Promise<RunningCoreInfo | null> {
    const running = await this.portManager.detectRunning(
      targetVersion,
      this.currentPort
    );
    if (running?.kind === "match") {
      this.updateConnectionInfo(running.port);
    }
    return running;
  }
  private async handleDetectedMismatch(
    running: RunningCoreInfo
  ): Promise<void> {
    this.channel.appendLine(
      `Detected outdated CodeAI Hub core (version ${running.version ?? "unknown"}) on port ${running.port}. Requesting shutdown...`
    );
    const stopped = await this.portManager.stopRunningCore(
      running.port,
      running.pid
    );
    if (stopped) {
      this.channel.appendLine("Outdated core stopped successfully.");
    } else {
      this.channel.appendLine(
        "Unable to stop outdated core automatically. Falling back to new port."
      );
    }
  }
  private launch(): void {
    if (this.child || !this.runtimeInfo) {
      return;
    }
    this.channel.appendLine("Starting CodeAI Hub core orchestrator...");
    const workspacePath = resolveWorkspacePath();
    const claudeModulePath = resolveProviderModulePath("claude");
    const codexModulePath = resolveProviderModulePath("codex");
    const geminiModulePath = resolveProviderModulePath("gemini");
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
      notifyExitListeners(this.exitListeners, this.channel);
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
}

import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { Codex as CodexCtor, Thread } from "@openai/codex-sdk";
import type { CodexAuthManager } from "../auth/sdk-auth-manager";
import type { CodexInstaller } from "../installer/codex-installer";
import { CodexSessionLogger } from "../logging/session-logger";
import type { CodexMessageProcessor } from "../messaging/message-processor";
import type { CodexSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type {
  CodexThreadOptions,
  CodexWorkspaceOptions,
  ModuleReporter,
} from "../types";

const CODEX_HOME_ENV = "CODEX_HOME";
const CODEX_CONFIG_FILE = "config.toml";
const DEFAULT_CODEX_HOME = path.join(homedir(), ".codeai-hub", "codex");
const MODEL_REASONING_KEY = "model_reasoning_effort";
const MODEL_REASONING_REGEX =
  /^model_reasoning_effort\s*=.*$/m;

type CodexManagerDependencies = {
  readonly installer: CodexInstaller;
  readonly authManager: CodexAuthManager;
  readonly sessions: CodexSessionManager;
  readonly processor: CodexMessageProcessor;
  readonly workspace: CodexWorkspaceOptions;
  readonly reporter?: ModuleReporter;
};

export class CodexSDKManager {
  private codexInstance: CodexCtor | null = null;
  private initialized = false;
  private readonly deps: CodexManagerDependencies;

  constructor(deps: CodexManagerDependencies) {
    this.deps = deps;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.ensureReasoningConfig();
    await this.deps.installer.ensureInstalled();
    await this.deps.authManager.ensureAuthenticated();
    this.applyAuthEnvironment();
    const loaded = await this.deps.installer.loadModule<{
      readonly Codex: typeof CodexCtor;
    }>();
    if (!loaded?.Codex) {
      throw new Error("Codex SDK module missing Codex export");
    }
    this.codexInstance = new loaded.Codex();
    this.initialized = true;
  }

  async createSession(): Promise<string> {
    await this.initialize();
    const logger = new CodexSessionLogger();
    const { tempId, session } = this.deps.sessions.createSession(logger);
    const thread = this.createThread();
    session.thread = thread;
    this.deps.processor.initializeSession(session, thread);
    return tempId;
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.deps.sessions.closeSession(sessionId);
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.deps.sessions.getSession(sessionId);
  }

  async sendMessage(
    sessionId: string,
    content: string,
    options?: { readonly internal?: boolean }
  ): Promise<void> {
    await this.initialize();
    this.deps.processor.enqueueMessage(sessionId, content, undefined, options);
  }

  private createThread(): Thread {
    if (!this.codexInstance) {
      throw new Error("Codex SDK not initialized");
    }
    const options = this.resolveThreadOptions();
    return this.codexInstance.startThread(options);
  }

  private resolveThreadOptions(): CodexThreadOptions {
    return {
      model: this.deps.workspace.defaultModel,
      modelReasoningEffort: this.deps.workspace.defaultReasoningEffort,
      sandboxMode: this.deps.workspace.defaultSandboxMode,
      workingDirectory: this.deps.workspace.workspacePath,
      skipGitRepoCheck: this.deps.workspace.skipGitRepoCheck,
    };
  }

  private async ensureReasoningConfig(): Promise<void> {
    const reasoningEffort = this.deps.workspace.defaultReasoningEffort;
    if (!reasoningEffort) {
      return;
    }

    const codexHome = this.resolveCodexHome();
    const configPath = path.join(codexHome, CODEX_CONFIG_FILE);
    const configLine = `${MODEL_REASONING_KEY} = "${reasoningEffort}"`;

    try {
      await fs.mkdir(codexHome, { recursive: true });
      const existing = await this.readConfigFile(configPath);
      const nextConfig = this.updateReasoningConfig(existing, configLine);
      await fs.writeFile(configPath, nextConfig, "utf8");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.deps.reporter?.warn?.(
        `Failed to persist Codex reasoning configuration: ${message}`
      );
    }
  }

  private resolveCodexHome(): string {
    const existing = process.env[CODEX_HOME_ENV];
    if (existing?.trim()) {
      return existing.trim();
    }
    process.env[CODEX_HOME_ENV] = DEFAULT_CODEX_HOME;
    return DEFAULT_CODEX_HOME;
  }

  private async readConfigFile(pathname: string): Promise<string> {
    try {
      return await fs.readFile(pathname, "utf8");
    } catch (error) {
      const candidate = error as NodeJS.ErrnoException;
      if (candidate.code === "ENOENT") {
        return "";
      }
      throw error;
    }
  }

  private updateReasoningConfig(
    existing: string,
    configLine: string
  ): string {
    if (!existing.trim()) {
      return `${configLine}\n`;
    }

    if (MODEL_REASONING_REGEX.test(existing)) {
      const updated = existing.replace(MODEL_REASONING_REGEX, configLine);
      return updated.endsWith("\n") ? updated : `${updated}\n`;
    }

    return `${existing.trimEnd()}\n${configLine}\n`;
  }

  private applyAuthEnvironment(): void {
    const authEnv = this.deps.authManager.getAuthEnvironment();
    for (const [key, value] of Object.entries(authEnv)) {
      if (value !== undefined) {
        process.env[key] = value;
      }
    }
  }
}

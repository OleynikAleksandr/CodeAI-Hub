import { promises as fs } from "node:fs";
import path from "node:path";
import type { Codex as CodexCtor, Thread } from "@openai/codex-sdk";
import { materializeCodexProviderConfigToml } from "../auth/codex-provider-config-materializer";
import type { CodexAuthManager } from "../auth/sdk-auth-manager";
import type { CodexInstaller } from "../installer/codex-installer";
import { CodexSessionLogger } from "../logging/session-logger";
import type { CodexMessageProcessor } from "../messaging/message-processor";
import type { CodexSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type {
  CodexThreadOptions,
  CodexTurnOptions,
  CodexWorkspaceOptions,
  ModuleReporter,
} from "../types";
import {
  patchCodexExecRun,
  patchCodexThreadPrototype,
} from "./codex-sdk-patches";

const CODEX_MODELS_CACHE_FILE = "models_cache.json";
const CODEX_CONFIG_FILE = "config.toml";
const CODEX_MIGRATION_FROM = "gpt-5.4";
const CODEX_MIGRATION_TO = "gpt-5.3-codex";

interface CodexManagerDependencies {
  readonly authManager: CodexAuthManager;
  readonly installer: CodexInstaller;
  readonly processor: CodexMessageProcessor;
  readonly reporter?: ModuleReporter;
  readonly sessions: CodexSessionManager;
  readonly workspace: CodexWorkspaceOptions;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const sanitizeModelsCacheRecord = (
  value: unknown
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const sanitizeModelsCacheEntry = (value: unknown): boolean => {
  if (!sanitizeModelsCacheRecord(value)) {
    return false;
  }
  if (value.slug !== CODEX_MIGRATION_FROM) {
    return false;
  }
  const upgrade = value.upgrade;
  if (!sanitizeModelsCacheRecord(upgrade)) {
    return false;
  }
  if (upgrade.model !== CODEX_MIGRATION_TO) {
    return false;
  }
  value.upgrade = undefined;
  return true;
};

const sanitizeModelsCachePayload = (
  payload: Record<string, unknown>
): boolean => {
  const models = payload.models;
  if (!Array.isArray(models)) {
    return false;
  }
  let changed = false;
  for (const model of models) {
    if (sanitizeModelsCacheEntry(model)) {
      changed = true;
    }
  }
  return changed;
};

export class CodexSDKManager {
  private codexInstance: CodexCtor | null = null;
  private initialized = false;
  private readonly deps: CodexManagerDependencies;
  private readonly workspaceDefaults: CodexWorkspaceOptions;

  constructor(deps: CodexManagerDependencies) {
    this.deps = deps;
    this.workspaceDefaults = { ...deps.workspace };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.deps.installer.ensureInstalled();
    await this.deps.authManager.ensureAuthenticated();
    this.applyAuthEnvironment();
    await this.sanitizeCodexHomeModelMigration();
    const loaded = await this.deps.installer.loadModule<{
      readonly Codex: typeof CodexCtor;
      readonly Thread: typeof import("@openai/codex-sdk").Thread;
    }>();
    if (!loaded?.Codex) {
      throw new Error("Codex SDK module missing Codex export");
    }
    patchCodexThreadPrototype(loaded.Thread);
    this.codexInstance = new loaded.Codex();
    patchCodexExecRun(
      (this.codexInstance as unknown as { exec?: unknown }).exec
    );
    this.initialized = true;
  }

  private async sanitizeCodexHomeModelMigration(): Promise<void> {
    const codexHome = process.env.CODEX_HOME;
    if (!codexHome) {
      return;
    }

    await Promise.all([
      this.sanitizeConfigToml(codexHome),
      this.sanitizeModelsCacheJson(codexHome),
    ]);
  }

  private async sanitizeConfigToml(codexHome: string): Promise<void> {
    const filePath = path.join(codexHome, CODEX_CONFIG_FILE);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const { changed, next } = materializeCodexProviderConfigToml(raw, {
        modelReasoningSummary: "auto",
      });
      if (!changed) {
        return;
      }
      await fs.writeFile(filePath, `${next.trimEnd()}\n`, "utf8");
      this.deps.reporter?.info?.(
        "Sanitized Codex provider config to provider-owned defaults"
      );
    } catch (error) {
      const candidate = error as NodeJS.ErrnoException;
      if (candidate.code === "ENOENT") {
        return;
      }
      this.deps.reporter?.warn?.(
        `Failed to sanitize Codex config.toml migrations: ${String(candidate.message ?? error)}`
      );
    }
  }

  private async sanitizeModelsCacheJson(codexHome: string): Promise<void> {
    const filePath = path.join(codexHome, CODEX_MODELS_CACHE_FILE);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecord(parsed)) {
        return;
      }
      const changed = sanitizeModelsCachePayload(parsed);
      if (!changed) {
        return;
      }

      await fs.writeFile(
        filePath,
        `${JSON.stringify(parsed, null, 2)}\n`,
        "utf8"
      );
      this.deps.reporter?.info?.(
        `Sanitized Codex models_cache upgrade ${CODEX_MIGRATION_FROM} -> ${CODEX_MIGRATION_TO}`
      );
    } catch (error) {
      const candidate = error as NodeJS.ErrnoException;
      if (candidate.code === "ENOENT") {
        return;
      }
      this.deps.reporter?.warn?.(
        `Failed to sanitize Codex models_cache.json migrations: ${String(candidate.message ?? error)}`
      );
    }
  }

  async createSession(workspacePath?: string): Promise<string> {
    await this.initialize();
    const actualWorkspacePath =
      workspacePath ?? this.deps.workspace.workspacePath;
    const logger = new CodexSessionLogger();
    const { tempId, session } = this.deps.sessions.createSession(
      actualWorkspacePath,
      logger
    );
    const thread = this.createThread(session);
    session.thread = thread;
    this.deps.processor.initializeSession(session, thread);
    return tempId;
  }

  async resumeSession(
    threadId: string,
    workspacePath?: string
  ): Promise<string> {
    await this.initialize();
    const actualWorkspacePath =
      workspacePath ?? this.deps.workspace.workspacePath;
    const logger = new CodexSessionLogger();

    const session = this.deps.sessions.createResumedSession(
      actualWorkspacePath,
      threadId,
      logger
    );
    const thread = this.createThread(session);
    (thread as unknown as { _id?: string | null })._id = threadId;
    session.thread = thread;
    this.deps.processor.initializeSession(session, thread);
    return threadId;
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
    turnOptions?: CodexTurnOptions,
    options?: { readonly internal?: boolean }
  ): Promise<void> {
    await this.initialize();
    const session = this.deps.sessions.getSession(sessionId);
    if (session) {
      session.responsePolicy = this.workspaceDefaults.defaultResponsePolicy;
    }
    this.deps.processor.enqueueMessage(
      sessionId,
      content,
      turnOptions,
      options
    );
  }

  private createThread(session: ActiveSession): Thread {
    if (!this.codexInstance) {
      throw new Error("Codex SDK not initialized");
    }
    const options = this.resolveThreadOptions(session);
    return this.codexInstance.startThread(options);
  }

  private resolveThreadOptions(session: ActiveSession): CodexThreadOptions {
    return {
      model: this.workspaceDefaults.defaultModel,
      modelReasoningEffort: this.workspaceDefaults.defaultReasoningEffort,
      sandboxMode: this.workspaceDefaults.defaultSandboxMode,
      workingDirectory: session.workspacePath,
      skipGitRepoCheck: this.workspaceDefaults.skipGitRepoCheck,
    };
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

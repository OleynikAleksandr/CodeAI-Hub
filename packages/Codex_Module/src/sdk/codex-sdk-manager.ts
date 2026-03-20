import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { Codex as CodexCtor, Thread } from "@openai/codex-sdk";
import type { CodexAuthManager } from "../auth/sdk-auth-manager";
import type { CodexInstaller } from "../installer/codex-installer";
import { CodexSessionLogger } from "../logging/session-logger";
import type { CodexMessageProcessor } from "../messaging/message-processor";
import { CodexResponsePolicyFacade } from "../response-policy/codex-response-policy-facade";
import type { CodexSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type {
  CodexReasoningEffort,
  CodexResponsePolicy,
  CodexThreadOptions,
  CodexTurnOptions,
  CodexWorkspaceOptions,
  ModuleReporter,
} from "../types";
import {
  patchCodexExecRun,
  patchCodexThreadPrototype,
} from "./codex-sdk-patches";

const CODEX_SETTINGS_FILE = path.join(
  homedir(),
  ".codeai-hub",
  "settings",
  "settings.json"
);
const CODEX_MODELS_CACHE_FILE = "models_cache.json";
const CODEX_CONFIG_FILE = "config.toml";
const CODEX_MIGRATION_FROM = "gpt-5.4";
const CODEX_MIGRATION_TO = "gpt-5.3-codex";
const NEWLINE_SPLIT_REGEX = /\r?\n/u;
const MIGRATION_LINE_REGEX =
  /^\s*(["']?)gpt-5\.4\1\s*=\s*(["']?)gpt-5\.3-codex\2\s*(#.*)?$/u;
const CODEX_REASONING_EFFORTS = new Set<CodexReasoningEffort>([
  "low",
  "medium",
  "high",
  "xhigh",
]);

type CodexSettingsSnapshot = {
  readonly defaultModel?: string;
  readonly reasoningByModel: Record<string, CodexReasoningEffort>;
  readonly responsePolicy?: CodexResponsePolicy;
};

type CodexManagerDependencies = {
  readonly installer: CodexInstaller;
  readonly authManager: CodexAuthManager;
  readonly sessions: CodexSessionManager;
  readonly processor: CodexMessageProcessor;
  readonly workspace: CodexWorkspaceOptions;
  readonly reporter?: ModuleReporter;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export const resolvePreferredCodexDefaultModel = (options: {
  readonly settingsDefaultModel?: string;
  readonly envDefaultModel?: string;
  readonly fallbackModel?: string;
}): string | undefined =>
  options.settingsDefaultModel ??
  normalizeOptionalString(options.envDefaultModel) ??
  options.fallbackModel;

const normalizeCodexReasoningEffort = (
  value: unknown
): CodexReasoningEffort | undefined =>
  typeof value === "string" &&
  CODEX_REASONING_EFFORTS.has(value as CodexReasoningEffort)
    ? (value as CodexReasoningEffort)
    : undefined;

const normalizeCodexReasoningByModel = (
  value: unknown
): Record<string, CodexReasoningEffort> => {
  if (!isRecord(value)) {
    return {};
  }

  const normalized: Record<string, CodexReasoningEffort> = {};
  for (const [modelId, reasoning] of Object.entries(value)) {
    const normalizedReasoning = normalizeCodexReasoningEffort(reasoning);
    if (normalizedReasoning) {
      normalized[modelId] = normalizedReasoning;
    }
  }

  return normalized;
};

const removeModelMigrationFromConfigToml = (
  raw: string
): {
  readonly changed: boolean;
  readonly next: string;
} => {
  const lines = raw.split(NEWLINE_SPLIT_REGEX);
  const nextLines: string[] = [];
  let inModelMigrationsSection = false;
  let changed = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      inModelMigrationsSection = trimmed === "[notice.model_migrations]";
      nextLines.push(line);
      continue;
    }

    if (inModelMigrationsSection && MIGRATION_LINE_REGEX.test(line)) {
      changed = true;
      continue;
    }

    nextLines.push(line);
  }

  return { changed, next: nextLines.join("\n") };
};

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
  private readonly responsePolicyFacade = new CodexResponsePolicyFacade();
  private workspaceDefaults: CodexWorkspaceOptions;

  constructor(deps: CodexManagerDependencies) {
    this.deps = deps;
    this.workspaceDefaults = { ...deps.workspace };
  }

  async initialize(): Promise<void> {
    await this.refreshWorkspaceDefaults();
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
      const { changed, next } = removeModelMigrationFromConfigToml(raw);
      if (!changed) {
        return;
      }
      await fs.writeFile(filePath, `${next.trimEnd()}\n`, "utf8");
      this.deps.reporter?.info?.(
        `Sanitized Codex config migration ${CODEX_MIGRATION_FROM} -> ${CODEX_MIGRATION_TO}`
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

  private async refreshWorkspaceDefaults(): Promise<void> {
    const settings = await this.loadCodexSettingsSnapshot();
    const envDefaultModel = normalizeOptionalString(
      process.env.CODEX_DEFAULT_MODEL
    );
    const envReasoningEffort = normalizeCodexReasoningEffort(
      process.env.CODEX_DEFAULT_REASONING_EFFORT
    );
    const settingsDefaultModel = settings?.defaultModel;
    const resolvedDefaultModel = resolvePreferredCodexDefaultModel({
      // Persisted settings are the runtime SSOT. Process env may be stale if
      // the host process outlives a settings change and never refreshes env.
      settingsDefaultModel,
      envDefaultModel,
      fallbackModel: this.deps.workspace.defaultModel,
    });
    const settingsReasoningEffort = resolvedDefaultModel
      ? settings?.reasoningByModel[resolvedDefaultModel]
      : undefined;
    const resolvedReasoningEffort =
      envReasoningEffort ??
      settingsReasoningEffort ??
      this.deps.workspace.defaultReasoningEffort;
    const resolvedResponsePolicy =
      settings?.responsePolicy ?? this.deps.workspace.defaultResponsePolicy;

    this.workspaceDefaults = {
      ...this.deps.workspace,
      defaultModel: resolvedDefaultModel,
      defaultReasoningEffort: resolvedReasoningEffort,
      defaultResponsePolicy: resolvedResponsePolicy,
    };
  }

  private async loadCodexSettingsSnapshot(): Promise<CodexSettingsSnapshot | null> {
    try {
      const raw = await fs.readFile(CODEX_SETTINGS_FILE, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return this.parseCodexSettingsSnapshot(parsed);
    } catch (error) {
      const candidate = error as NodeJS.ErrnoException;
      if (candidate.code === "ENOENT") {
        return null;
      }
      return null;
    }
  }

  private parseCodexSettingsSnapshot(
    value: unknown
  ): CodexSettingsSnapshot | null {
    if (!isRecord(value)) {
      return null;
    }

    const providers = isRecord(value.providers) ? value.providers : null;
    const codex =
      providers && isRecord(providers.codex) ? providers.codex : null;
    if (!codex) {
      return null;
    }

    return {
      defaultModel: normalizeOptionalString(codex.defaultModel),
      reasoningByModel: normalizeCodexReasoningByModel(codex.reasoningByModel),
      responsePolicy: this.responsePolicyFacade.resolve(
        isRecord(value.general) ? value.general.responsePolicy : undefined
      ),
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

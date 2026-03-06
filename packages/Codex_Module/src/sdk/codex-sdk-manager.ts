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
  CodexReasoningEffort,
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
const LEGACY_CODEX_GENERAL_MODEL_ID = "gpt-5.2";
const CURRENT_CODEX_GENERAL_MODEL_ID = "gpt-5.4";
const CODEX_REASONING_EFFORTS = new Set<CodexReasoningEffort>([
  "low",
  "medium",
  "high",
  "xhigh",
]);

type CodexSettingsSnapshot = {
  readonly defaultModel?: string;
  readonly reasoningByModel: Record<string, CodexReasoningEffort>;
};

type CodexManagerDependencies = {
  readonly installer: CodexInstaller;
  readonly authManager: CodexAuthManager;
  readonly sessions: CodexSessionManager;
  readonly processor: CodexMessageProcessor;
  readonly workspace: CodexWorkspaceOptions;
  readonly reporter?: ModuleReporter;
};

type SendMessageOptions = {
  readonly internal?: boolean;
  readonly outboundAttemptId?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const normalizeCodexModelId = (value: unknown): string | undefined => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return;
  }

  return normalized === LEGACY_CODEX_GENERAL_MODEL_ID
    ? CURRENT_CODEX_GENERAL_MODEL_ID
    : normalized;
};

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
    const normalizedModelId = normalizeCodexModelId(modelId);
    const normalizedReasoning = normalizeCodexReasoningEffort(reasoning);
    if (!(normalizedModelId && normalizedReasoning)) {
      continue;
    }

    if (
      normalizedModelId in normalized &&
      normalizedModelId !== modelId.trim()
    ) {
      continue;
    }

    normalized[normalizedModelId] = normalizedReasoning;
  }

  return normalized;
};

export class CodexSDKManager {
  private codexInstance: CodexCtor | null = null;
  private initialized = false;
  private readonly deps: CodexManagerDependencies;
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

    // Codex CLI treats the original thread model as sticky. When resuming a
    // `gpt-5.3-codex` thread, switching to the general-purpose `gpt-5.4`
    // selection requires a fresh thread to keep the user's choice intact.
    if (
      this.workspaceDefaults.defaultModel === CURRENT_CODEX_GENERAL_MODEL_ID
    ) {
      this.deps.reporter?.info?.(
        `Codex resume skipped for thread ${threadId} because defaultModel=${CURRENT_CODEX_GENERAL_MODEL_ID}; starting a new thread instead`
      );
      const { tempId, session: newSession } = this.deps.sessions.createSession(
        actualWorkspacePath,
        logger
      );
      const thread = this.createThread(newSession);
      newSession.thread = thread;
      this.deps.processor.initializeSession(newSession, thread);
      return tempId;
    }

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
    options?: SendMessageOptions
  ): Promise<void> {
    await this.initialize();
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
    const envDefaultModel = normalizeCodexModelId(
      process.env.CODEX_DEFAULT_MODEL
    );
    const envReasoningEffort = normalizeCodexReasoningEffort(
      process.env.CODEX_DEFAULT_REASONING_EFFORT
    );
    const settingsDefaultModel = settings?.defaultModel;
    // Settings are the SSOT. Core/provider processes can outlive a Settings save,
    // so boot-time env may be stale until restart.
    const resolvedDefaultModel =
      settingsDefaultModel ??
      envDefaultModel ??
      this.deps.workspace.defaultModel;
    const settingsReasoningEffort = resolvedDefaultModel
      ? settings?.reasoningByModel[resolvedDefaultModel]
      : undefined;
    const resolvedReasoningEffort =
      settingsReasoningEffort ??
      envReasoningEffort ??
      this.deps.workspace.defaultReasoningEffort;

    this.workspaceDefaults = {
      ...this.deps.workspace,
      defaultModel: resolvedDefaultModel,
      defaultReasoningEffort: resolvedReasoningEffort,
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
      defaultModel: normalizeCodexModelId(codex.defaultModel),
      reasoningByModel: normalizeCodexReasoningByModel(codex.reasoningByModel),
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

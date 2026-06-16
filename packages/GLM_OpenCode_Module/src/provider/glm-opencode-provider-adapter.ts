import { randomUUID } from "node:crypto";
import type { GlmOpenCodeSessionEvent } from "./glm-opencode-output-normalizer";
import { GlmOpenCodeServerRuntime } from "./glm-opencode-runner";
import {
  buildGlmOpenCodeRuntimeProfile,
  ensureGlmOpenCodeRuntimeProfile,
  GLM_OPENCODE_DEFAULT_MODEL_SELECTOR,
  GLM_OPENCODE_MODEL_ID,
  KIMI_OPENCODE_DEFAULT_MODEL_SELECTOR,
  KIMI_OPENCODE_MODEL_ID,
} from "./glm-opencode-runtime-profile";

export const GLM_OPENCODE_PROVIDER_ID = "glmOpenCode" as const;
export type { GlmOpenCodeSessionEvent } from "./glm-opencode-output-normalizer";
export {
  GLM_OPENCODE_DEFAULT_MODEL_SELECTOR,
  GLM_OPENCODE_MODEL_ID,
  KIMI_OPENCODE_DEFAULT_MODEL_SELECTOR,
  KIMI_OPENCODE_MODEL_ID,
} from "./glm-opencode-runtime-profile";

export type GlmOpenCodeSessionListener = (
  payload: GlmOpenCodeSessionEvent
) => void;

export interface ModuleReporter {
  readonly error?: (
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>
  ) => void;
  readonly info?: (message: string, metadata?: Record<string, unknown>) => void;
  readonly warn?: (message: string, metadata?: Record<string, unknown>) => void;
}

export interface GlmOpenCodeWorkspaceOptions {
  readonly configPath?: string;
  readonly defaultModel?: string;
  readonly providerHomePath?: string;
  readonly settingsPath?: string;
  readonly workspacePath?: string;
}

export interface GlmOpenCodeModuleOptions {
  readonly reporter?: ModuleReporter;
  readonly workspace: GlmOpenCodeWorkspaceOptions;
}

interface GlmOpenCodeSessionState {
  remoteSessionId?: string;
  readonly sessionId: string;
  readonly workspacePath?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readAppliedTurnConfigModel = (
  turnOptions?: Record<string, unknown>
): string | null => {
  const applied = isRecord(turnOptions?.appliedTurnConfig)
    ? turnOptions.appliedTurnConfig
    : null;
  return (
    readString(applied?.baseModelId) ??
    readString(applied?.modelId) ??
    readString(applied?.effectiveModelId) ??
    readString(turnOptions?.selectedModelId)
  );
};

const normalizeRequestedModel = (model: string | null): string | null => {
  if (!model || model === GLM_OPENCODE_MODEL_ID) {
    return GLM_OPENCODE_DEFAULT_MODEL_SELECTOR;
  }
  if (model === "kimi-k2.7-code" || model === KIMI_OPENCODE_MODEL_ID) {
    return KIMI_OPENCODE_DEFAULT_MODEL_SELECTOR;
  }
  return model;
};

export class GlmOpenCodeProviderAdapter {
  private readonly listeners = new Map<
    string,
    Set<GlmOpenCodeSessionListener>
  >();
  private readonly options: GlmOpenCodeModuleOptions;
  private readonly runtime = new GlmOpenCodeServerRuntime();
  private readonly sessions = new Map<string, GlmOpenCodeSessionState>();
  private initialized = false;

  constructor(options: GlmOpenCodeModuleOptions) {
    this.options = options;
  }

  initialize(): Promise<void> {
    const profile = buildGlmOpenCodeRuntimeProfile({
      configPath: this.options.workspace.configPath,
      defaultModel: this.options.workspace.defaultModel,
      providerHomePath: this.options.workspace.providerHomePath,
      settingsPath: this.options.workspace.settingsPath,
      workspacePath: this.options.workspace.workspacePath,
    });
    ensureGlmOpenCodeRuntimeProfile(profile);
    this.initialized = true;
    this.options.reporter?.info?.("OpenCode wrapper provider initialized", {
      command: profile.command,
      configPath: profile.configPath,
      modelSelector: profile.modelSelector,
      providerHomePath: profile.providerHomePath,
      providerId: GLM_OPENCODE_PROVIDER_ID,
      workspacePath: profile.workspacePath ?? null,
    });
    return Promise.resolve();
  }

  createSession(workspacePath?: string): Promise<string> {
    this.assertInitialized();
    const sessionId = `opencode-${randomUUID()}`;
    this.sessions.set(sessionId, {
      sessionId,
      workspacePath: workspacePath ?? this.options.workspace.workspacePath,
    });
    this.listeners.set(sessionId, new Set());
    return Promise.resolve(sessionId);
  }

  resumeSession(sessionId: string, workspacePath?: string): Promise<string> {
    this.assertInitialized();
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        workspacePath: workspacePath ?? this.options.workspace.workspacePath,
      });
    }
    return Promise.resolve(sessionId);
  }

  subscribe(
    sessionId: string,
    listener: GlmOpenCodeSessionListener
  ): () => void {
    const listeners =
      this.listeners.get(sessionId) ?? new Set<GlmOpenCodeSessionListener>();
    listeners.add(listener);
    this.listeners.set(sessionId, listeners);
    return () => {
      listeners.delete(listener);
    };
  }

  async sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): Promise<void> {
    this.assertInitialized();
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Cannot send an empty OpenCode wrapper message.");
    }
    const session = this.requireSession(sessionId);
    const profile = buildGlmOpenCodeRuntimeProfile({
      configPath: this.options.workspace.configPath,
      defaultModel: this.options.workspace.defaultModel,
      providerHomePath: this.options.workspace.providerHomePath,
      settingsPath: this.options.workspace.settingsPath,
      workspacePath: session.workspacePath,
    });
    ensureGlmOpenCodeRuntimeProfile(profile);
    const modelSelector =
      normalizeRequestedModel(readAppliedTurnConfigModel(turnOptions)) ??
      profile.modelSelector;
    this.emit(sessionId, {
      provider: GLM_OPENCODE_PROVIDER_ID,
      timestamp: new Date().toISOString(),
      type: "turn_started",
      uuid: `${randomUUID()}::turn_started`,
    });
    await this.runtime
      .runTurn({
        content: trimmedContent,
        modelSelector,
        onEvent: (event) => {
          this.emit(sessionId, event);
        },
        onRemoteSessionId: (remoteSessionId) => {
          session.remoteSessionId = remoteSessionId;
        },
        profile,
        remoteSessionId: session.remoteSessionId,
      })
      .finally(() => undefined);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session?.remoteSessionId) {
      const profile = buildGlmOpenCodeRuntimeProfile({
        configPath: this.options.workspace.configPath,
        defaultModel: this.options.workspace.defaultModel,
        providerHomePath: this.options.workspace.providerHomePath,
        settingsPath: this.options.workspace.settingsPath,
        workspacePath: session.workspacePath,
      });
      await this.runtime.abortRemoteSession(profile, session.remoteSessionId);
      await this.runtime.deleteRemoteSession(profile, session.remoteSessionId);
    }
    this.sessions.delete(sessionId);
    this.listeners.delete(sessionId);
  }

  captureNativeRequest(options: {
    readonly recordAppliedInputEnvelope?: (envelope: {
      readonly kind: "glm-opencode";
      readonly modelSelector: string;
      readonly userConfigPath: string;
    }) => Promise<void> | void;
    readonly selectedModelId?: string | null;
  }): Promise<void> {
    const profile = buildGlmOpenCodeRuntimeProfile({
      configPath: this.options.workspace.configPath,
      defaultModel:
        options.selectedModelId ?? this.options.workspace.defaultModel,
      providerHomePath: this.options.workspace.providerHomePath,
      settingsPath: this.options.workspace.settingsPath,
      workspacePath: this.options.workspace.workspacePath,
    });
    return Promise.resolve(
      options.recordAppliedInputEnvelope?.({
        kind: "glm-opencode",
        modelSelector: profile.modelSelector,
        userConfigPath: profile.configPath,
      })
    );
  }

  refreshUsageLimits(params: {
    readonly broadcast: (event: unknown) => void;
    readonly providerSessionId: string;
  }): void {
    params.broadcast({
      data: {
        collectedAt: new Date().toISOString(),
        kind: "usage_limits",
        source: "opencode",
        usageLimits: null,
      },
      providerScopeKey: "glmOpenCode:global",
      providerSessionId: params.providerSessionId,
      usageLimits: null,
    });
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error("OpenCode wrapper provider is not initialized.");
    }
  }

  private requireSession(sessionId: string): GlmOpenCodeSessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`OpenCode wrapper session not found: ${sessionId}`);
    }
    return session;
  }

  private emit(sessionId: string, payload: GlmOpenCodeSessionEvent): void {
    for (const listener of this.listeners.get(sessionId) ?? []) {
      listener(payload);
    }
  }
}

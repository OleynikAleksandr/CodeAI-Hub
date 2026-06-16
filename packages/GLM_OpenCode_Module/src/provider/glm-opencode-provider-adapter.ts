import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { GlmOpenCodeSessionEvent } from "./glm-opencode-output-normalizer";
import { runGlmOpenCodeTurn } from "./glm-opencode-runner";
import {
  buildGlmOpenCodeRuntimeProfile,
  ensureGlmOpenCodeRuntimeProfile,
  GLM_OPENCODE_DEFAULT_MODEL_SELECTOR,
  GLM_OPENCODE_MODEL_ID,
} from "./glm-opencode-runtime-profile";

export const GLM_OPENCODE_PROVIDER_ID = "glmOpenCode" as const;
export type { GlmOpenCodeSessionEvent } from "./glm-opencode-output-normalizer";
export {
  GLM_OPENCODE_DEFAULT_MODEL_SELECTOR,
  GLM_OPENCODE_MODEL_ID,
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
  readonly workspacePath?: string;
}

export interface GlmOpenCodeModuleOptions {
  readonly reporter?: ModuleReporter;
  readonly workspace: GlmOpenCodeWorkspaceOptions;
}

interface GlmOpenCodeSessionState {
  childProcess?: ChildProcessWithoutNullStreams;
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

const normalizeRequestedModel = (model: string | null): string | null =>
  !model || model === GLM_OPENCODE_MODEL_ID
    ? GLM_OPENCODE_DEFAULT_MODEL_SELECTOR
    : model;

export class GlmOpenCodeProviderAdapter {
  private readonly listeners = new Map<
    string,
    Set<GlmOpenCodeSessionListener>
  >();
  private readonly options: GlmOpenCodeModuleOptions;
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
      workspacePath: this.options.workspace.workspacePath,
    });
    ensureGlmOpenCodeRuntimeProfile(profile);
    this.initialized = true;
    this.options.reporter?.info?.("GLM-OpenCode provider initialized", {
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
    const sessionId = `glm-opencode-${randomUUID()}`;
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
      throw new Error("Cannot send an empty GLM-OpenCode message.");
    }
    const session = this.requireSession(sessionId);
    const profile = buildGlmOpenCodeRuntimeProfile({
      configPath: this.options.workspace.configPath,
      defaultModel: this.options.workspace.defaultModel,
      providerHomePath: this.options.workspace.providerHomePath,
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
    await runGlmOpenCodeTurn({
      content: trimmedContent,
      modelSelector,
      onChildProcess: (childProcess) => {
        session.childProcess = childProcess;
      },
      onEvent: (event) => {
        this.emit(sessionId, event);
      },
      profile,
    }).finally(() => {
      session.childProcess = undefined;
    });
  }

  closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    session?.childProcess?.kill("SIGTERM");
    this.sessions.delete(sessionId);
    this.listeners.delete(sessionId);
    return Promise.resolve();
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
        source: "glm-opencode",
        usageLimits: null,
      },
      providerScopeKey: "glmOpenCode:global",
      providerSessionId: params.providerSessionId,
      usageLimits: null,
    });
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error("GLM-OpenCode provider is not initialized.");
    }
  }

  private requireSession(sessionId: string): GlmOpenCodeSessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`GLM-OpenCode session not found: ${sessionId}`);
    }
    return session;
  }

  private emit(sessionId: string, payload: GlmOpenCodeSessionEvent): void {
    for (const listener of this.listeners.get(sessionId) ?? []) {
      listener(payload);
    }
  }
}

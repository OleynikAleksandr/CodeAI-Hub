import { randomUUID } from "node:crypto";
import {
  buildGlmRuntimeProfile,
  ensureGlmRuntimeProfile,
  GLM_CONTEXT_WINDOW_TOKEN_LIMIT,
  type GlmRuntimeProfile,
} from "./glm-native-runtime-profile";
import {
  type GlmTokenUsage,
  parseGlmSseData,
  readSseDataFrames,
} from "./glm-native-sse-parser";

export const GLM_NATIVE_PROVIDER_ID = "glmNative" as const;

export interface ModuleReporter {
  readonly error?: (
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>
  ) => void;
  readonly info?: (message: string, metadata?: Record<string, unknown>) => void;
  readonly warn?: (message: string, metadata?: Record<string, unknown>) => void;
}

export interface GlmWorkspaceOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly defaultModel?: string;
  readonly providerHomePath?: string;
  readonly reasoningEffort?: string;
  readonly settingsPath?: string;
  readonly thinkingEnabled?: boolean;
  readonly workspacePath?: string;
}

export interface GlmModuleOptions {
  readonly reporter?: ModuleReporter;
  readonly workspace: GlmWorkspaceOptions;
}

export interface GlmSessionEvent {
  readonly content?: string;
  readonly data?: Record<string, unknown>;
  readonly message?: string;
  readonly provider?: string;
  readonly tag?: string;
  readonly timestamp?: string;
  readonly tokenUsage?: {
    readonly limit: number;
    readonly used: number;
  };
  readonly type: string;
  readonly uuid?: string;
}

interface GlmSessionState {
  readonly abortControllers: Set<AbortController>;
  readonly messages: GlmSessionMessage[];
  readonly sessionId: string;
  readonly workspacePath?: string;
}

interface GlmSessionMessage {
  readonly content: string;
  readonly reasoning_content?: string;
  readonly role: string;
}

interface GlmAssistantTurn {
  readonly content: string;
  readonly reasoningContent: string;
}

interface GlmRequestFailure extends Error {
  code?: string;
  status?: number;
}

const GLM_MAX_REQUEST_ATTEMPTS = 3;
const GLM_RETRY_DELAY_MS = 750;
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);
const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504, 529]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const readErrorCause = (error: Error): unknown =>
  (error as Error & { readonly cause?: unknown }).cause;

const readAppliedTurnConfig = (
  turnOptions?: Record<string, unknown>
): Record<string, unknown> | null =>
  isRecord(turnOptions?.appliedTurnConfig)
    ? turnOptions.appliedTurnConfig
    : null;

const readAppliedTurnConfigModel = (
  turnOptions?: Record<string, unknown>
): string | null => {
  const applied = readAppliedTurnConfig(turnOptions);
  return (
    readString(applied?.baseModelId) ??
    readString(applied?.modelId) ??
    readString(applied?.effectiveModelId) ??
    readString(turnOptions?.selectedModelId)
  );
};

const readAppliedTurnConfigReasoning = (
  turnOptions?: Record<string, unknown>
): string | null => {
  const applied = readAppliedTurnConfig(turnOptions);
  return readString(applied?.reasoningEffort);
};

const readAppliedTurnConfigThinkingEnabled = (
  turnOptions?: Record<string, unknown>
): boolean | null => {
  const applied = readAppliedTurnConfig(turnOptions);
  return typeof applied?.thinkingEnabled === "boolean"
    ? applied.thinkingEnabled
    : null;
};

const buildGlmFailureMessage = (error: unknown): string => {
  if (error instanceof Error && error.name === "AbortError") {
    return "GLM request was stopped.";
  }
  if (error instanceof Error) {
    const causeValue = readErrorCause(error);
    const cause = isRecord(causeValue) ? causeValue : null;
    const causeCode = readString(cause?.code);
    const causeMessage = readString(cause?.message);
    if (causeCode || causeMessage) {
      return `${error.message} (${[causeCode, causeMessage].filter(Boolean).join(": ")})`;
    }
    const status = readNumber((error as GlmRequestFailure).status);
    return status ? `${error.message} (HTTP ${status})` : error.message;
  }
  return String(error);
};

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export class GlmProviderAdapter {
  private readonly listeners = new Map<string, Set<(event: unknown) => void>>();
  private readonly options: GlmModuleOptions;
  private readonly sessions = new Map<string, GlmSessionState>();
  private initialized = false;

  constructor(options: GlmModuleOptions) {
    this.options = options;
  }

  initialize(): Promise<void> {
    const profile = this.buildProfile();
    ensureGlmRuntimeProfile(profile);
    this.initialized = true;
    this.options.reporter?.info?.("GLM native provider initialized", {
      baseUrl: profile.baseUrl,
      model: profile.model,
      providerHomePath: profile.providerHomePath,
      providerId: GLM_NATIVE_PROVIDER_ID,
      workspacePath: profile.workspacePath ?? null,
    });
    return Promise.resolve();
  }

  createSession(workspacePath?: string): Promise<string> {
    this.assertInitialized();
    const sessionId = `glm-${randomUUID()}`;
    this.sessions.set(sessionId, {
      abortControllers: new Set(),
      messages: [],
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
        abortControllers: new Set(),
        messages: [],
        sessionId,
        workspacePath: workspacePath ?? this.options.workspace.workspacePath,
      });
    }
    return Promise.resolve(sessionId);
  }

  subscribe(
    sessionId: string,
    listener: (payload: unknown) => void
  ): () => void {
    const listeners = this.listeners.get(sessionId) ?? new Set();
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
    const session = this.requireSession(sessionId);
    const userContent = content.trim();
    if (userContent.length === 0) {
      throw new Error("Cannot send an empty GLM message.");
    }
    const profile = this.buildProfile({
      defaultModel: readAppliedTurnConfigModel(turnOptions) ?? undefined,
      reasoningEffort: readAppliedTurnConfigReasoning(turnOptions) ?? undefined,
      thinkingEnabled:
        readAppliedTurnConfigThinkingEnabled(turnOptions) ?? undefined,
      workspacePath: session.workspacePath,
    });
    const abortController = new AbortController();
    session.abortControllers.add(abortController);
    this.emit(sessionId, this.buildEvent("turn_started"));
    try {
      const assistantTurn = await this.streamTurn({
        abortController,
        profile,
        session,
        sessionId,
        userContent,
      });
      session.messages.push({ role: "user", content: userContent });
      if (assistantTurn.content.trim().length > 0) {
        session.messages.push({
          role: "assistant",
          content: assistantTurn.content,
          ...(assistantTurn.reasoningContent.trim().length > 0
            ? { reasoning_content: assistantTurn.reasoningContent }
            : {}),
        });
      }
      this.emit(sessionId, this.buildEvent("turn_completed"));
    } catch (error) {
      this.emit(sessionId, {
        ...this.buildEvent("turn_failed"),
        message: buildGlmFailureMessage(error),
      });
    } finally {
      session.abortControllers.delete(abortController);
    }
  }

  closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    for (const controller of session?.abortControllers ?? []) {
      controller.abort();
    }
    this.sessions.delete(sessionId);
    this.listeners.delete(sessionId);
    return Promise.resolve();
  }

  private async streamTurn(options: {
    readonly abortController: AbortController;
    readonly profile: GlmRuntimeProfile;
    readonly session: GlmSessionState;
    readonly sessionId: string;
    readonly userContent: string;
  }): Promise<GlmAssistantTurn> {
    const requestBody = this.buildRequestBody(options);
    const response = await this.openGlmResponseWithRetry({
      abortController: options.abortController,
      profile: options.profile,
      requestBody,
    });
    if (!response.body) {
      throw new Error("GLM response did not include a stream body.");
    }
    let assistantContent = "";
    let reasoningContent = "";
    for await (const data of readSseDataFrames(
      response.body as AsyncIterable<Uint8Array>
    )) {
      const chunk = parseGlmSseData(data);
      if (!chunk) {
        continue;
      }
      if (chunk.reasoning) {
        reasoningContent += chunk.reasoning;
        this.emit(options.sessionId, {
          ...this.buildEvent("thinking"),
          content: chunk.reasoning,
          tag: "thinking",
        });
      }
      if (chunk.content) {
        assistantContent += chunk.content;
        this.emit(options.sessionId, {
          ...this.buildEvent("assistant"),
          content: chunk.content,
        });
      }
      if (chunk.usage) {
        this.emitTokenUsage(options.sessionId, chunk.usage);
      }
    }
    return { content: assistantContent, reasoningContent };
  }

  private buildRequestBody(options: {
    readonly profile: GlmRuntimeProfile;
    readonly session: GlmSessionState;
    readonly userContent: string;
  }): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: options.profile.model,
      messages: [
        ...options.session.messages,
        { role: "user", content: options.userContent },
      ],
      stream: true,
      thinking: {
        type: options.profile.thinkingEnabled ? "enabled" : "disabled",
        ...(options.profile.thinkingEnabled ? { clear_thinking: false } : {}),
      },
    };
    if (options.profile.thinkingEnabled) {
      body.reasoning_effort = options.profile.reasoningEffort;
    }
    return body;
  }

  private async openGlmResponseWithRetry(options: {
    readonly abortController: AbortController;
    readonly profile: GlmRuntimeProfile;
    readonly requestBody: Record<string, unknown>;
  }): Promise<Response> {
    for (let attempt = 1; attempt <= GLM_MAX_REQUEST_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(options.profile.chatCompletionsUrl, {
          body: JSON.stringify(options.requestBody),
          headers: {
            Authorization: `Bearer ${options.profile.apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: options.abortController.signal,
        });
        if (!response.ok) {
          throw await this.buildHttpError(response);
        }
        return response;
      } catch (error) {
        if (
          attempt >= GLM_MAX_REQUEST_ATTEMPTS ||
          options.abortController.signal.aborted ||
          !this.isRetryableGlmFailure(error)
        ) {
          throw error;
        }
        this.options.reporter?.warn?.(
          "Retrying transient GLM request failure",
          {
            attempt,
            message: buildGlmFailureMessage(error),
            nextAttempt: attempt + 1,
          }
        );
        await delay(GLM_RETRY_DELAY_MS * attempt);
      }
    }
    throw new Error("GLM request failed before a fetch attempt was made.");
  }

  private buildProfile(
    override?: Pick<
      GlmWorkspaceOptions,
      "defaultModel" | "reasoningEffort" | "thinkingEnabled" | "workspacePath"
    >
  ): GlmRuntimeProfile {
    return buildGlmRuntimeProfile({
      ...this.options.workspace,
      ...(override?.defaultModel
        ? { defaultModel: override.defaultModel }
        : {}),
      ...(override?.reasoningEffort
        ? { reasoningEffort: override.reasoningEffort }
        : {}),
      ...(typeof override?.thinkingEnabled === "boolean"
        ? { thinkingEnabled: override.thinkingEnabled }
        : {}),
      ...(override?.workspacePath
        ? { workspacePath: override.workspacePath }
        : {}),
    });
  }

  private emitTokenUsage(sessionId: string, usage: GlmTokenUsage): void {
    this.emit(sessionId, {
      ...this.buildEvent("stream_event"),
      data: {
        cachedTokens: usage.cachedTokens ?? 0,
        completionTokens: usage.completionTokens,
        kind: "token_usage",
        limit: GLM_CONTEXT_WINDOW_TOKEN_LIMIT,
        promptTokens: usage.promptTokens,
        reasoningTokens: usage.reasoningTokens ?? 0,
        totalTokens: usage.totalTokens,
        used: usage.totalTokens,
      },
      tokenUsage: {
        limit: GLM_CONTEXT_WINDOW_TOKEN_LIMIT,
        used: usage.totalTokens,
      },
    });
  }

  private async readResponseError(response: Response): Promise<string> {
    const text = await response.text().catch(() => "");
    if (text.trim().length === 0) {
      return `GLM request failed with HTTP ${response.status}.`;
    }
    return `GLM request failed with HTTP ${response.status}: ${text.trim()}`;
  }

  private async buildHttpError(response: Response): Promise<GlmRequestFailure> {
    const error = new Error(
      await this.readResponseError(response)
    ) as GlmRequestFailure;
    error.status = response.status;
    return error;
  }

  private isRetryableGlmFailure(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    const failure = error as GlmRequestFailure;
    if (
      typeof failure.status === "number" &&
      RETRYABLE_HTTP_STATUSES.has(failure.status)
    ) {
      return true;
    }
    const causeValue = readErrorCause(error);
    const cause = isRecord(causeValue) ? causeValue : null;
    const code = readString(failure.code) ?? readString(cause?.code);
    return Boolean(code && RETRYABLE_ERROR_CODES.has(code));
  }

  private buildEvent(type: string): GlmSessionEvent {
    return {
      provider: GLM_NATIVE_PROVIDER_ID,
      timestamp: new Date().toISOString(),
      type,
      uuid: `${randomUUID()}::${type}`,
    };
  }

  private emit(sessionId: string, event: GlmSessionEvent): void {
    for (const listener of this.listeners.get(sessionId) ?? []) {
      listener(event);
    }
  }

  private requireSession(sessionId: string): GlmSessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown GLM session: ${sessionId}`);
    }
    return session;
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error("GLM provider adapter is not initialized.");
    }
  }
}

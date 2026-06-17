import { randomUUID } from "node:crypto";
import {
  buildGlmFailureMessage,
  type GlmRequestFailure,
  isRetryableGlmFailure,
  readAppliedTurnConfigModel,
  readAppliedTurnConfigReasoning,
  readAppliedTurnConfigThinkingEnabled,
} from "./glm-native-adapter-utils";
import {
  buildGlmNativeAssistantToolMessage,
  buildGlmNativeSystemMessage,
  executeGlmNativeToolCall,
  GLM_NATIVE_MAX_TOOL_STEPS,
  GLM_NATIVE_WORKFLOW_TOOLS,
  type GlmSessionMessage,
} from "./glm-native-agent-runtime";
import {
  buildGlmRuntimeProfile,
  ensureGlmRuntimeProfile,
  GLM_CONTEXT_WINDOW_TOKEN_LIMIT,
  type GlmRuntimeProfile,
} from "./glm-native-runtime-profile";
import type { GlmTokenUsage } from "./glm-native-sse-parser";
import { readGlmStreamResponse } from "./glm-native-stream-reader";

export const GLM_NATIVE_PROVIDER_ID = "glmNative" as const;

export interface ModuleReporter {
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
  readonly tokenUsage?: { readonly limit: number; readonly used: number };
  readonly type: string;
  readonly uuid?: string;
}

interface GlmSessionState {
  readonly abortControllers: Set<AbortController>;
  readonly messages: GlmSessionMessage[];
  readonly sessionId: string;
  readonly workspacePath?: string;
}

interface GlmAssistantTurn {
  readonly messages: readonly GlmSessionMessage[];
}

const GLM_MAX_REQUEST_ATTEMPTS = 3;
const GLM_RETRY_DELAY_MS = 750;

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
      session.messages.push(...assistantTurn.messages);
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
    const turnMessages: GlmSessionMessage[] = [
      { role: "user", content: options.userContent },
    ];
    for (let step = 1; step <= GLM_NATIVE_MAX_TOOL_STEPS; step += 1) {
      const result = await this.streamRequest({
        abortController: options.abortController,
        messages: [...options.session.messages, ...turnMessages],
        profile: options.profile,
        sessionId: options.sessionId,
      });
      if (result.toolCalls.length === 0) {
        if (result.content.trim().length > 0) {
          turnMessages.push({
            content: result.content,
            ...(result.reasoningContent.trim().length > 0
              ? { reasoning_content: result.reasoningContent }
              : {}),
            role: "assistant",
          });
        }
        return { messages: turnMessages };
      }
      const assistantToolMessage = buildGlmNativeAssistantToolMessage(result);
      turnMessages.push(assistantToolMessage);
      for (const toolCall of assistantToolMessage.tool_calls ?? []) {
        turnMessages.push(
          await executeGlmNativeToolCall(
            toolCall,
            options.session.workspacePath
          )
        );
      }
    }
    throw new Error("GLM workflow tool loop exceeded the maximum step count.");
  }

  private async streamRequest(options: {
    readonly abortController: AbortController;
    readonly messages: readonly GlmSessionMessage[];
    readonly profile: GlmRuntimeProfile;
    readonly sessionId: string;
  }) {
    const requestBody = this.buildRequestBody(options);
    for (let attempt = 1; attempt <= GLM_MAX_REQUEST_ATTEMPTS; attempt += 1) {
      let emittedUsefulEvent = false;
      try {
        const response = await this.openGlmResponseWithRetry({
          abortController: options.abortController,
          profile: options.profile,
          requestBody,
        });
        if (!response.body) {
          throw new Error("GLM response did not include a stream body.");
        }
        const result = await readGlmStreamResponse(
          response.body as AsyncIterable<Uint8Array>,
          {
            onAssistant: (content) =>
              this.emit(options.sessionId, {
                ...this.buildEvent("assistant"),
                content,
                tag: "live",
              }),
            onThinking: (content) =>
              this.emit(options.sessionId, {
                ...this.buildEvent("thinking"),
                content,
                tag: "thinking",
              }),
            onUsage: (usage) => this.emitTokenUsage(options.sessionId, usage),
          }
        );
        emittedUsefulEvent = result.emittedUsefulEvent;
        return result;
      } catch (error) {
        if (
          emittedUsefulEvent ||
          attempt >= GLM_MAX_REQUEST_ATTEMPTS ||
          options.abortController.signal.aborted ||
          !isRetryableGlmFailure(error)
        ) {
          throw error;
        }
        this.options.reporter?.warn?.("Retrying interrupted GLM stream", {
          attempt,
          message: buildGlmFailureMessage(error),
          nextAttempt: attempt + 1,
        });
        await delay(GLM_RETRY_DELAY_MS * attempt);
      }
    }
    throw new Error("GLM stream failed before a read attempt was made.");
  }

  private buildRequestBody(options: {
    readonly messages: readonly GlmSessionMessage[];
    readonly profile: GlmRuntimeProfile;
  }): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: options.profile.model,
      messages: [
        buildGlmNativeSystemMessage(options.profile),
        ...options.messages,
      ],
      stream: true,
      stream_options: { include_usage: true },
      thinking: {
        type: options.profile.thinkingEnabled ? "enabled" : "disabled",
        ...(options.profile.thinkingEnabled ? { clear_thinking: false } : {}),
      },
      tool_choice: "auto",
      tool_stream: true,
      tools: GLM_NATIVE_WORKFLOW_TOOLS,
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
          !isRetryableGlmFailure(error)
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

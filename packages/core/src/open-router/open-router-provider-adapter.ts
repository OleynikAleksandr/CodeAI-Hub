import { randomUUID } from "node:crypto";
import { resolveCodexWorkflowInvocationProfile } from "@codeai-hub/codex-app-server-module";
import {
  buildGlmNativeAssistantToolMessage,
  executeGlmNativeToolCall,
  GLM_NATIVE_MAX_TOOL_STEPS,
  GLM_NATIVE_WORKFLOW_TOOLS,
  type GlmSessionMessage,
} from "@codeai-hub/glm-module";
import type { ProviderAdapter } from "../provider-registry/provider-module-loader.types";
import { readAppliedProviderTurnConfig } from "../remote-bridge/types";
import {
  createOpenRouterChatCompletionRequest,
  type OpenRouterToolCall,
  readOpenRouterChatCompletionStream,
} from "./open-router-sse-reader";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_REQUEST_TIMEOUT_MS = 600_000;
const JSON_HEADERS = { "content-type": "application/json" } as const;
const OPENROUTER_API_KEY_OPTION = "__codeaiOpenRouterApiKey";
const OPENROUTER_BASE_URL_OPTION = "__codeaiOpenRouterBaseUrl";
const OPENROUTER_ENDPOINT_TAG_OPTION = "openRouterEndpointTag";
const TRAILING_SLASHES_PATTERN = /\/+$/u;

type OpenRouterSessionListener = (payload: unknown) => void;

interface OpenRouterMessage {
  readonly content: string;
  readonly role: "assistant" | "system" | "tool" | "user";
  readonly tool_call_id?: string;
  readonly tool_calls?: readonly OpenRouterToolCall[];
}

interface OpenRouterProviderAdapterOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly defaultEndpointTag?: string;
  readonly defaultModel?: string;
  readonly fetchImplementation?: typeof fetch;
  readonly timeoutMs?: number;
}

const normalizeOptionalString = (value: unknown): string | undefined => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveBaseUrl = (baseUrl?: string): string =>
  (
    normalizeOptionalString(baseUrl) ??
    normalizeOptionalString(process.env.CODEAI_OPENROUTER_BASE_URL) ??
    DEFAULT_BASE_URL
  ).replace(TRAILING_SLASHES_PATTERN, "");

const resolveApiKey = (apiKey?: string): string | undefined =>
  normalizeOptionalString(apiKey) ??
  normalizeOptionalString(process.env.OPENROUTER_API_KEY) ??
  normalizeOptionalString(process.env.CODEAI_OPENROUTER_API_KEY);

const resolveRequestTimeoutMs = (timeoutMs?: number): number => {
  if (Number.isFinite(timeoutMs) && Number(timeoutMs) > 0) {
    return Number(timeoutMs);
  }
  const raw = Number(process.env.CODEAI_OPENROUTER_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_REQUEST_TIMEOUT_MS;
};

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const truncateDiagnosticBody = (body: string): string =>
  body.trim().slice(0, 500);

const buildOpenRouterSystemMessage = (
  model: string,
  workspacePath?: string
): OpenRouterMessage => ({
  content: [
    resolveCodexWorkflowInvocationProfile().baseInstructions,
    "",
    "# OpenRouter Runtime Tooling",
    "",
    "- Runtime provider: OpenRouter Chat Completions.",
    `- OpenRouter model: ${model}.`,
    `- Workspace root: ${workspacePath ?? "(not provided)"}.`,
    "- Executable tools are provided in the request `tools` array using OpenAI-compatible function-call format.",
    "- Every declared tool has a local CodeAI Hub executor; do not claim a tool succeeded unless its result says `ok: true`.",
    "- Use `write_workflow_artifact` for managed workflow artifacts when the prompt gives an exact `.codeai-hub/...` target path.",
  ].join("\n"),
  role: "system",
});

const toOpenRouterMessage = (
  message: GlmSessionMessage
): OpenRouterMessage => ({
  content: message.content,
  role: message.role as OpenRouterMessage["role"],
  ...(message.tool_call_id ? { tool_call_id: message.tool_call_id } : {}),
  ...(message.tool_calls
    ? { tool_calls: message.tool_calls as readonly OpenRouterToolCall[] }
    : {}),
});

export class OpenRouterProviderAdapter implements ProviderAdapter {
  readonly #apiKey?: string;
  readonly #baseUrl: string;
  readonly #defaultEndpointTag?: string;
  readonly #defaultModel?: string;
  readonly #fetchImplementation: typeof fetch;
  readonly #listenersBySessionId = new Map<
    string,
    Set<OpenRouterSessionListener>
  >();
  readonly #messagesBySessionId = new Map<string, OpenRouterMessage[]>();
  readonly #workspacePathBySessionId = new Map<string, string | undefined>();
  readonly #timeoutMs: number;

  constructor(options: OpenRouterProviderAdapterOptions = {}) {
    this.#apiKey = resolveApiKey(options.apiKey);
    this.#baseUrl = resolveBaseUrl(options.baseUrl);
    this.#defaultEndpointTag = normalizeOptionalString(
      options.defaultEndpointTag
    );
    this.#defaultModel =
      normalizeOptionalString(options.defaultModel) ??
      normalizeOptionalString(process.env.CODEAI_OPENROUTER_DEFAULT_MODEL);
    this.#fetchImplementation = options.fetchImplementation ?? fetch;
    this.#timeoutMs = resolveRequestTimeoutMs(options.timeoutMs);
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  createSession(workspacePath?: string): Promise<string> {
    const sessionId = `openrouter-${randomUUID()}`;
    this.#listenersBySessionId.set(sessionId, new Set());
    this.#messagesBySessionId.set(sessionId, []);
    this.#workspacePathBySessionId.set(sessionId, workspacePath);
    return Promise.resolve(sessionId);
  }

  resumeSession(sessionId: string, workspacePath?: string): Promise<string> {
    if (!this.#listenersBySessionId.has(sessionId)) {
      this.#listenersBySessionId.set(sessionId, new Set());
    }
    if (!this.#messagesBySessionId.has(sessionId)) {
      this.#messagesBySessionId.set(sessionId, []);
    }
    this.#workspacePathBySessionId.set(sessionId, workspacePath);
    return Promise.resolve(sessionId);
  }

  closeSession(sessionId: string): Promise<void> {
    this.#listenersBySessionId.delete(sessionId);
    this.#messagesBySessionId.delete(sessionId);
    this.#workspacePathBySessionId.delete(sessionId);
    return Promise.resolve();
  }

  subscribe(
    sessionId: string,
    listener: OpenRouterSessionListener
  ): () => void {
    const listeners = this.#listenersBySessionId.get(sessionId) ?? new Set();
    listeners.add(listener);
    this.#listenersBySessionId.set(sessionId, listeners);
    return () => {
      listeners.delete(listener);
    };
  }

  async sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    this.#emit(sessionId, {
      provider: "openRouter",
      timestamp,
      type: "turn_started",
      uuid: `${randomUUID()}::turn_started`,
    });
    try {
      const model = this.#resolveModel(turnOptions);
      const endpointTag = this.#resolveEndpointTag(turnOptions);
      const apiKey = this.#resolveApiKey(turnOptions);
      const baseUrl = this.#resolveBaseUrl(turnOptions);
      const workspacePath = this.#workspacePathBySessionId.get(sessionId);
      const currentMessages = this.#messagesBySessionId.get(sessionId) ?? [];
      const userMessage: OpenRouterMessage = { content, role: "user" };
      const requestMessages = [...currentMessages, userMessage];
      const result = await this.#complete(
        requestMessages,
        model,
        endpointTag,
        apiKey,
        baseUrl,
        sessionId,
        workspacePath
      );
      this.#messagesBySessionId.set(sessionId, result.messages);
      this.#emit(sessionId, {
        content: result.content,
        provider: "openRouter",
        timestamp: new Date().toISOString(),
        type: "assistant",
        uuid: `${randomUUID()}::assistant`,
      });
      this.#emit(sessionId, {
        provider: "openRouter",
        timestamp: new Date().toISOString(),
        type: "turn_completed",
        uuid: `${randomUUID()}::turn_completed`,
      });
    } catch (error) {
      this.#emit(sessionId, {
        message: describeError(error),
        provider: "openRouter",
        timestamp: new Date().toISOString(),
        type: "turn_failed",
        uuid: `${randomUUID()}::turn_failed`,
      });
      throw error;
    }
  }

  #resolveModel(turnOptions?: Record<string, unknown>): string {
    const model =
      normalizeOptionalString(
        readAppliedProviderTurnConfig(turnOptions)?.modelId
      ) ?? this.#defaultModel;
    if (!model) {
      throw new Error("No OpenRouter model selected.");
    }
    return model;
  }

  #resolveEndpointTag(
    turnOptions?: Record<string, unknown>
  ): string | undefined {
    return (
      normalizeOptionalString(turnOptions?.[OPENROUTER_ENDPOINT_TAG_OPTION]) ??
      this.#defaultEndpointTag
    );
  }

  #resolveApiKey(turnOptions?: Record<string, unknown>): string | undefined {
    return (
      normalizeOptionalString(turnOptions?.[OPENROUTER_API_KEY_OPTION]) ??
      this.#apiKey
    );
  }

  #resolveBaseUrl(turnOptions?: Record<string, unknown>): string {
    return resolveBaseUrl(
      normalizeOptionalString(turnOptions?.[OPENROUTER_BASE_URL_OPTION]) ??
        this.#baseUrl
    );
  }

  async #complete(
    initialMessages: readonly OpenRouterMessage[],
    model: string,
    endpointTag: string | undefined,
    apiKey: string | undefined,
    baseUrl: string,
    sessionId: string,
    workspacePath?: string
  ): Promise<{
    readonly content: string;
    readonly messages: OpenRouterMessage[];
  }> {
    if (!apiKey) {
      throw new Error("OpenRouter API key is not configured.");
    }
    let messages = [...initialMessages];
    for (let step = 0; step < GLM_NATIVE_MAX_TOOL_STEPS; step += 1) {
      const result = await this.#completeOnce(
        messages,
        model,
        endpointTag,
        apiKey,
        baseUrl,
        sessionId,
        workspacePath
      );
      if (result.toolCalls.length === 0) {
        const finalMessages = [
          ...messages,
          { content: result.content, role: "assistant" as const },
        ];
        return { content: result.content, messages: finalMessages };
      }
      const assistantToolMessage = buildGlmNativeAssistantToolMessage({
        content: result.content,
        reasoningContent: "",
        toolCalls: result.toolCalls,
      });
      const toolMessages = await Promise.all(
        assistantToolMessage.tool_calls?.map((toolCall) =>
          executeGlmNativeToolCall(toolCall, workspacePath)
        ) ?? []
      );
      messages = [
        ...messages,
        toOpenRouterMessage(assistantToolMessage),
        ...toolMessages.map(toOpenRouterMessage),
      ];
    }
    throw new Error("OpenRouter tool loop exceeded maximum tool steps.");
  }

  async #completeOnce(
    messages: readonly OpenRouterMessage[],
    model: string,
    endpointTag: string | undefined,
    apiKey: string,
    baseUrl: string,
    sessionId: string,
    workspacePath?: string
  ): Promise<{
    readonly content: string;
    readonly toolCalls: readonly OpenRouterToolCall[];
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await this.#fetchImplementation(
        `${baseUrl}/chat/completions`,
        {
          body: JSON.stringify(
            createOpenRouterChatCompletionRequest({
              ...(endpointTag ? { endpointTag } : {}),
              messages: [
                buildOpenRouterSystemMessage(model, workspacePath),
                ...messages,
              ],
              model,
              toolChoice: "auto",
              tools: GLM_NATIVE_WORKFLOW_TOOLS,
            })
          ),
          headers: {
            ...JSON_HEADERS,
            Authorization: `Bearer ${apiKey}`,
            "X-Title": "CodeAI Hub",
          },
          method: "POST",
          signal: controller.signal,
        }
      ).catch((error: unknown) => {
        throw new Error(`OpenRouter request failed: ${describeError(error)}`);
      });
      if (!response.ok) {
        const diagnosticBody = truncateDiagnosticBody(await response.text());
        throw new Error(
          diagnosticBody
            ? `OpenRouter request failed with status ${response.status}: ${diagnosticBody}`
            : `OpenRouter request failed with status ${response.status}`
        );
      }
      let pendingReasoning = "";
      const flushReasoning = () => {
        if (pendingReasoning.length === 0) {
          return;
        }
        this.#emitReasoningChunk(sessionId, pendingReasoning);
        pendingReasoning = "";
      };
      const result = await readOpenRouterChatCompletionStream(
        response,
        (chunk) => {
          flushReasoning();
          this.#emitLiveAssistantChunk(sessionId, chunk);
        },
        (chunk) => {
          pendingReasoning += chunk;
        }
      );
      flushReasoning();
      return { content: result.content, toolCalls: result.toolCalls };
    } finally {
      clearTimeout(timeout);
    }
  }

  #emitLiveAssistantChunk(sessionId: string, chunk: string): void {
    this.#emit(sessionId, {
      content: chunk,
      provider: "openRouter",
      tag: "live",
      timestamp: new Date().toISOString(),
      type: "assistant",
      uuid: `${randomUUID()}::assistant_live`,
    });
  }

  #emitReasoningChunk(sessionId: string, chunk: string): void {
    this.#emit(sessionId, {
      content: chunk,
      provider: "openRouter",
      tag: "thinking",
      timestamp: new Date().toISOString(),
      type: "thinking",
      uuid: `${randomUUID()}::thinking`,
    });
  }

  #emit(sessionId: string, payload: unknown): void {
    for (const listener of this.#listenersBySessionId.get(sessionId) ?? []) {
      listener(payload);
    }
  }
}

import { randomUUID } from "node:crypto";
import type { ProviderAdapter } from "../provider-registry/provider-module-loader.types";
import { readAppliedProviderTurnConfig } from "../remote-bridge/types";
import {
  createDefaultLmsCommandRunner,
  ensureLmStudioServerRunning,
  type LmsCommandRunner,
} from "./local-models-cli";
import {
  type LocalModelDescriptor,
  LocalModelsFacade,
} from "./local-models-facade";
import { LocalModelsRuntimeLoadManager } from "./local-models-runtime-load-manager";

const DEFAULT_LM_STUDIO_BASE_URL = "http://127.0.0.1:1234";
const DEFAULT_MAX_TOKENS = 8192;
const REQUEST_TIMEOUT_MS = 300_000;
const JSON_HEADERS = { "content-type": "application/json" } as const;
const TRAILING_SLASHES_PATTERN = /\/+$/u;

type LocalModelsSessionListener = (payload: unknown) => void;

interface NativeChatOutputItem {
  readonly content?: unknown;
  readonly type?: unknown;
}

interface NativeChatResponse {
  readonly output?: readonly NativeChatOutputItem[];
  readonly stats?: {
    readonly reasoning_output_tokens?: unknown;
    readonly total_output_tokens?: unknown;
  };
}

const resolveBaseUrl = (): string =>
  (process.env.CODEAI_LMSTUDIO_BASE_URL ?? DEFAULT_LM_STUDIO_BASE_URL)
    .trim()
    .replace(TRAILING_SLASHES_PATTERN, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseTextContent = (content: unknown): string | null => {
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!Array.isArray(content)) {
    return null;
  }
  const segments = content
    .map((segment) => {
      if (typeof segment === "string") {
        return segment.trim();
      }
      if (!isRecord(segment)) {
        return "";
      }
      for (const key of ["text", "content", "value"] as const) {
        const value = segment[key];
        if (typeof value === "string" && value.trim().length > 0) {
          return value.trim();
        }
      }
      return "";
    })
    .filter((segment) => segment.length > 0);
  return segments.length > 0 ? segments.join("\n") : null;
};

const parseNativeChatText = (payload: unknown): string | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const output = (payload as NativeChatResponse).output;
  if (!Array.isArray(output)) {
    return null;
  }
  const messages = output
    .filter((item) => item.type === "message" || item.type === "assistant")
    .map((item) => parseTextContent(item.content))
    .filter((text): text is string => typeof text === "string");
  return messages.length > 0 ? messages.join("\n\n").trim() : null;
};

const truncateDiagnosticBody = (body: string): string =>
  body.trim().slice(0, 500);

const describeErrorCause = (cause: unknown): string | null => {
  if (cause instanceof Error) {
    return cause.message;
  }
  if (typeof cause === "string" && cause.trim().length > 0) {
    return cause.trim();
  }
  if (!isRecord(cause)) {
    return null;
  }
  const parts: string[] = [];
  for (const key of ["code", "name", "message"] as const) {
    const value = cause[key];
    if (typeof value === "string" && value.trim().length > 0) {
      parts.push(`${key}=${value.trim()}`);
    }
  }
  return parts.length > 0 ? parts.join(" ") : null;
};

const describeError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = describeErrorCause(
    (error as Error & { readonly cause?: unknown }).cause
  );
  return cause ? `${error.message} (${cause})` : error.message;
};

const describeNativeChatOutput = (payload: unknown): string => {
  if (!isRecord(payload)) {
    return "malformed response";
  }
  const output = (payload as NativeChatResponse).output;
  const outputTypes = Array.isArray(output)
    ? output.map((item) => String(item.type ?? "unknown")).join(", ")
    : "missing";
  const stats = (payload as NativeChatResponse).stats;
  const totalOutputTokens =
    typeof stats?.total_output_tokens === "number"
      ? stats.total_output_tokens
      : "unknown";
  const reasoningOutputTokens =
    typeof stats?.reasoning_output_tokens === "number"
      ? stats.reasoning_output_tokens
      : "unknown";
  return `output types=${outputTypes}; total_output_tokens=${totalOutputTokens}; reasoning_output_tokens=${reasoningOutputTokens}`;
};

export class LocalModelsProviderAdapter implements ProviderAdapter {
  readonly #baseUrl = resolveBaseUrl();
  readonly #commandRunner: LmsCommandRunner;
  readonly #facade: LocalModelsFacade;
  readonly #fetchImplementation: typeof fetch;
  readonly #listenersBySessionId = new Map<
    string,
    Set<LocalModelsSessionListener>
  >();
  readonly #runtimeLoadManager: LocalModelsRuntimeLoadManager;

  constructor(
    options: {
      readonly commandRunner?: LmsCommandRunner;
      readonly fetchImplementation?: typeof fetch;
    } = {}
  ) {
    this.#commandRunner =
      options.commandRunner ?? createDefaultLmsCommandRunner();
    this.#fetchImplementation = options.fetchImplementation ?? fetch;
    this.#facade = new LocalModelsFacade({
      commandRunner: this.#commandRunner,
      fetchImplementation: this.#fetchImplementation,
    });
    this.#runtimeLoadManager = new LocalModelsRuntimeLoadManager({
      commandRunner: this.#commandRunner,
    });
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  createSession(): Promise<string> {
    const sessionId = `lmstudio-${randomUUID()}`;
    this.#listenersBySessionId.set(sessionId, new Set());
    return Promise.resolve(sessionId);
  }

  resumeSession(sessionId: string): Promise<string> {
    if (!this.#listenersBySessionId.has(sessionId)) {
      this.#listenersBySessionId.set(sessionId, new Set());
    }
    return Promise.resolve(sessionId);
  }

  closeSession(sessionId: string): Promise<void> {
    this.#listenersBySessionId.delete(sessionId);
    return Promise.resolve();
  }

  subscribe(
    sessionId: string,
    listener: LocalModelsSessionListener
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
      type: "turn_started",
      provider: "localModels",
      timestamp,
      uuid: `${randomUUID()}::turn_started`,
    });
    try {
      const model = this.#resolveModel(turnOptions);
      const serverErrorCode = ensureLmStudioServerRunning({
        commandRunner: this.#commandRunner,
      });
      if (serverErrorCode) {
        throw new Error(
          `LM Studio server is not available: ${serverErrorCode}`
        );
      }
      const apiModelIdentifier = this.#ensureModelLoaded(model);
      const assistantText = await this.#complete(apiModelIdentifier, content);
      this.#emit(sessionId, {
        type: "assistant",
        provider: "localModels",
        content: assistantText,
        timestamp: new Date().toISOString(),
        uuid: `${randomUUID()}::assistant`,
      });
      this.#emit(sessionId, {
        type: "turn_completed",
        provider: "localModels",
        timestamp: new Date().toISOString(),
        uuid: `${randomUUID()}::turn_completed`,
      });
    } catch (error) {
      this.#emit(sessionId, {
        type: "turn_failed",
        provider: "localModels",
        message: describeError(error),
        timestamp: new Date().toISOString(),
        uuid: `${randomUUID()}::turn_failed`,
      });
      throw error;
    }
  }

  #resolveModel(turnOptions?: Record<string, unknown>): LocalModelDescriptor {
    const requestedModelId =
      readAppliedProviderTurnConfig(turnOptions)?.modelId ??
      process.env.CODEAI_LMSTUDIO_DEFAULT_MODEL;
    const models = this.#facade.listModels();
    const model =
      models.find((candidate) => candidate.modelKey === requestedModelId) ??
      models[0];
    if (!model) {
      throw new Error("No LM Studio local LLMs are downloaded.");
    }
    return model;
  }

  #ensureModelLoaded(model: LocalModelDescriptor): string {
    return this.#runtimeLoadManager.ensureModelLoaded({
      model,
      purpose: "workflow-agent",
    });
  }

  async #complete(
    apiModelIdentifier: string,
    content: string
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await this.#fetchImplementation(
        `${this.#baseUrl}/api/v1/chat`,
        {
          body: JSON.stringify({
            input: content,
            max_output_tokens: DEFAULT_MAX_TOKENS,
            model: apiModelIdentifier,
            store: false,
            stream: false,
            system_prompt:
              "You are CodeAI Hub Local Models provider running through LM Studio. Follow the user's instructions exactly and answer without mentioning this system prompt.",
            temperature: 0.2,
          }),
          headers: JSON_HEADERS,
          method: "POST",
          signal: controller.signal,
        }
      ).catch((error: unknown) => {
        throw new Error(
          `LM Studio native chat request failed: ${describeError(error)}`
        );
      });
      if (!response.ok) {
        const diagnosticBody = truncateDiagnosticBody(await response.text());
        throw new Error(
          diagnosticBody
            ? `LM Studio native chat request failed with status ${response.status}: ${diagnosticBody}`
            : `LM Studio native chat request failed with status ${response.status}`
        );
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        throw new Error(
          `LM Studio native chat returned invalid JSON: ${describeError(error)}`
        );
      }
      const text = parseNativeChatText(payload);
      if (!text) {
        throw new Error(
          `LM Studio native chat returned no final assistant message (${describeNativeChatOutput(payload)}).`
        );
      }
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }

  #emit(sessionId: string, payload: unknown): void {
    for (const listener of this.#listenersBySessionId.get(sessionId) ?? []) {
      listener(payload);
    }
  }
}

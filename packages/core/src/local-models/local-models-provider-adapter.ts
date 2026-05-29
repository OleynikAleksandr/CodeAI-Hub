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

const DEFAULT_LM_STUDIO_BASE_URL = "http://127.0.0.1:1234";
const DEFAULT_CONTEXT_LENGTH = "8192";
const DEFAULT_MAX_TOKENS = 8192;
const MODEL_LOAD_TIMEOUT_MS = 120_000;
const REQUEST_TIMEOUT_MS = 300_000;
const JSON_HEADERS = { "content-type": "application/json" } as const;
const TRAILING_SLASHES_PATTERN = /\/+$/u;

type LocalModelsSessionListener = (payload: unknown) => void;

interface ChatCompletionResponse {
  readonly choices?: readonly {
    readonly message?: { readonly content?: unknown };
  }[];
}

const resolveBaseUrl = (): string =>
  (process.env.CODEAI_LMSTUDIO_BASE_URL ?? DEFAULT_LM_STUDIO_BASE_URL)
    .trim()
    .replace(TRAILING_SLASHES_PATTERN, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseChatText = (payload: unknown): string | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const content = (payload as ChatCompletionResponse).choices?.[0]?.message
    ?.content;
  return typeof content === "string" && content.trim().length > 0
    ? content.trim()
    : null;
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
  readonly #loadedModelKeys = new Set<string>();

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
      this.#ensureModelLoaded(model.modelKey);
      const assistantText = await this.#complete(model.modelKey, content);
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
        message: error instanceof Error ? error.message : String(error),
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

  #ensureModelLoaded(modelKey: string): void {
    if (this.#loadedModelKeys.has(modelKey)) {
      return;
    }
    this.#commandRunner(
      [
        "load",
        modelKey,
        "--context-length",
        process.env.CODEAI_LMSTUDIO_CONTEXT_LENGTH ?? DEFAULT_CONTEXT_LENGTH,
      ],
      { timeoutMs: MODEL_LOAD_TIMEOUT_MS }
    );
    this.#loadedModelKeys.add(modelKey);
  }

  async #complete(modelKey: string, content: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await this.#fetchImplementation(
        `${this.#baseUrl}/v1/chat/completions`,
        {
          body: JSON.stringify({
            max_tokens: DEFAULT_MAX_TOKENS,
            messages: [
              {
                role: "system",
                content:
                  "You are CodeAI Hub Local Models provider running through LM Studio. Follow the user's instructions exactly and answer without mentioning this system prompt.",
              },
              { role: "user", content },
            ],
            model: modelKey,
            stream: false,
            temperature: 0.2,
          }),
          headers: JSON_HEADERS,
          method: "POST",
          signal: controller.signal,
        }
      );
      if (!response.ok) {
        throw new Error(
          `LM Studio request failed with status ${response.status}`
        );
      }
      const text = parseChatText(await response.json());
      if (!text) {
        throw new Error("LM Studio returned an empty assistant response.");
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

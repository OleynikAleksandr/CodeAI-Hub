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
const DEFAULT_AGENT_CONTEXT_LENGTH = 16_384;
const DEFAULT_MAX_TOKENS = 8192;
const MODEL_LOAD_TIMEOUT_MS = 120_000;
const REQUEST_TIMEOUT_MS = 300_000;
const JSON_HEADERS = { "content-type": "application/json" } as const;
const LM_STUDIO_IDENTIFIER_SAFE_PATTERN = /[^a-zA-Z0-9._-]+/gu;
const TRAILING_SLASHES_PATTERN = /\/+$/u;

type LocalModelsSessionListener = (payload: unknown) => void;

interface ChatCompletionResponse {
  readonly choices?: readonly {
    readonly message?: { readonly content?: unknown };
  }[];
}

interface LoadedLmStudioModelRecord {
  readonly contextLength?: unknown;
  readonly identifier?: unknown;
  readonly modelKey?: unknown;
  readonly type?: unknown;
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

const asPositiveInteger = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const resolveAgentContextLength = (model: LocalModelDescriptor): number => {
  const requested =
    asPositiveInteger(process.env.CODEAI_LMSTUDIO_AGENT_CONTEXT_LENGTH) ??
    DEFAULT_AGENT_CONTEXT_LENGTH;
  return typeof model.maxContextLength === "number"
    ? Math.min(requested, model.maxContextLength)
    : requested;
};

const buildCodeAiIdentifier = (
  modelKey: string,
  contextLength: number
): string =>
  `codeaihub-${modelKey.replace(
    LM_STUDIO_IDENTIFIER_SAFE_PATTERN,
    "-"
  )}-${contextLength}`;

const parseLoadedModels = (
  payload: string
): readonly LoadedLmStudioModelRecord[] => {
  try {
    const parsed = JSON.parse(payload) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const isLoadedWithContext = (options: {
  readonly contextLength: number;
  readonly identifier: string;
  readonly records: readonly LoadedLmStudioModelRecord[];
}): boolean =>
  options.records.some(
    (record) =>
      record.type === "llm" &&
      record.identifier === options.identifier &&
      typeof record.contextLength === "number" &&
      record.contextLength >= options.contextLength
  );

const truncateDiagnosticBody = (body: string): string =>
  body.trim().slice(0, 500);

export class LocalModelsProviderAdapter implements ProviderAdapter {
  readonly #baseUrl = resolveBaseUrl();
  readonly #commandRunner: LmsCommandRunner;
  readonly #facade: LocalModelsFacade;
  readonly #fetchImplementation: typeof fetch;
  readonly #listenersBySessionId = new Map<
    string,
    Set<LocalModelsSessionListener>
  >();
  readonly #loadedModelIdentifiers = new Set<string>();

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

  #ensureModelLoaded(model: LocalModelDescriptor): string {
    const contextLength = resolveAgentContextLength(model);
    const identifier = buildCodeAiIdentifier(model.modelKey, contextLength);
    if (this.#loadedModelIdentifiers.has(identifier)) {
      return identifier;
    }
    const loadedModels = parseLoadedModels(
      this.#commandRunner(["ps", "--json"], {
        timeoutMs: MODEL_LOAD_TIMEOUT_MS,
      })
    );
    if (
      isLoadedWithContext({
        contextLength,
        identifier,
        records: loadedModels,
      })
    ) {
      this.#loadedModelIdentifiers.add(identifier);
      return identifier;
    }
    this.#commandRunner(
      [
        "load",
        model.modelKey,
        "--context-length",
        String(contextLength),
        "--identifier",
        identifier,
      ],
      { timeoutMs: MODEL_LOAD_TIMEOUT_MS }
    );
    this.#loadedModelIdentifiers.add(identifier);
    return identifier;
  }

  async #complete(
    apiModelIdentifier: string,
    content: string
  ): Promise<string> {
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
            model: apiModelIdentifier,
            stream: false,
            temperature: 0.2,
          }),
          headers: JSON_HEADERS,
          method: "POST",
          signal: controller.signal,
        }
      );
      if (!response.ok) {
        const diagnosticBody = truncateDiagnosticBody(await response.text());
        throw new Error(
          diagnosticBody
            ? `LM Studio request failed with status ${response.status}: ${diagnosticBody}`
            : `LM Studio request failed with status ${response.status}`
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

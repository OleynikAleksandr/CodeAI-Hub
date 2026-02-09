import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { CliArgs } from "@google/gemini-cli/dist/src/config/config";
import type { AuthType as AuthTypeEnum } from "@google/gemini-cli-core/dist/src/core/contentGenerator";
import type { CompletedToolCall } from "@google/gemini-cli-core/dist/src/core/coreToolScheduler";
import type {
  ServerGeminiStreamEvent,
  ToolCallRequestInfo,
} from "@google/gemini-cli-core/dist/src/core/turn";
import type { Part, UsageMetadata } from "@google/genai";
import { GeminiMessageProcessor } from "../messaging/message-processor";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { GeminiSessionEvent, ModuleReporter } from "../types";
import { GeminiToolExecutorFacade } from "./gemini-tool-executor-facade";
import type {
  ActiveSession,
  SessionCreationOptions,
  SessionCreationResult,
} from "./types";

const GEMINI_ENV_KEYS_TO_CLEAR = [
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_PROJECT_ID",
  "GOOGLE_CLOUD_LOCATION",
  "GOOGLE_API_KEY",
] as const;

const TOOL_RESPONSE_FALLBACK =
  "Gemini tool execution completed without response parts.";

const MAX_TOOL_CALL_CHAIN_DEPTH = 8;

type GeminiTurnResult = {
  readonly responseText: string;
  readonly usage?: UsageMetadata;
  readonly citations: readonly string[];
  readonly toolRequests: readonly ToolCallRequestInfo[];
};

type ToolExecutionOutcome = {
  readonly parts: Part[];
  readonly events: GeminiSessionEvent[];
  readonly completedCalls: CompletedToolCall[];
};

type ConversationResult = {
  readonly text: string;
  readonly citations: readonly string[];
  readonly usage?: UsageMetadata;
  readonly depthExceeded: boolean;
};

type ProcessTurnContext = {
  readonly session: ActiveSession;
  readonly parts: Part[];
  readonly promptId: string;
  readonly signal: AbortSignal;
  readonly depth: number;
};

type GeminiSettingsSnapshot = {
  readonly providers?: {
    readonly gemini?: {
      readonly defaultModel?: unknown;
      readonly thinkingLevelByModel?: Record<string, unknown>;
    };
  };
};

export class GeminiSessionManager {
  private readonly sessions = new Map<string, ActiveSession>();
  private readonly sessionAliases = new Map<string, string>();

  private readonly modules: GeminiCliModules;
  private readonly toolExecutorFacade: GeminiToolExecutorFacade;

  constructor(modules: GeminiCliModules, reporter?: ModuleReporter) {
    this.modules = modules;
    this.toolExecutorFacade = new GeminiToolExecutorFacade(
      this.modules,
      reporter
    );
    this.sanitizeEnvironment();
  }

  listSessions(): readonly ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  async createSession(
    options: SessionCreationOptions
  ): Promise<SessionCreationResult> {
    const workspacePath = options.workspacePath;
    const sessionId = randomUUID();
    const eventEmitter = new EventEmitter();

    const settings = this.modules.settings.loadSettings(workspacePath);
    const migrateDeprecatedSettings = this.modules.settings
      .migrateDeprecatedSettings as unknown;
    if (typeof migrateDeprecatedSettings === "function") {
      (
        migrateDeprecatedSettings as (
          loadedSettings: unknown,
          extensionManager?: unknown
        ) => void
      )(settings, {
        // Extensions are not supported inside the CodeAI Hub bridge yet.
        disableExtension: async () => {
          /* noop */
        },
      });
    }

    const settingsSnapshot = this.loadSettingsSnapshot(options.settingsPath);
    const defaultModelOverride =
      this.resolveDefaultModelFromSnapshot(settingsSnapshot);
    const resolvedModel = defaultModelOverride ?? options.defaultModel;

    const thinkingLevelOverride = resolvedModel
      ? this.resolveThinkingLevelFromSnapshot(settingsSnapshot, resolvedModel)
      : undefined;
    const resolvedThinkingLevel =
      thinkingLevelOverride ?? options.thinkingLevel;

    const argv = this.createArgv({
      ...options,
      defaultModel: resolvedModel,
      thinkingLevel: resolvedThinkingLevel,
    });

    const loadCliConfig = this.modules.config
      .loadCliConfig as typeof this.modules.config.loadCliConfig;

    const config = await loadCliConfig(
      settings.merged,
      sessionId,
      argv,
      workspacePath
    );

    const authType = this.resolveAuthType(
      settings.merged.security?.auth?.selectedType
    );

    try {
      await config.refreshAuth(authType);
    } catch (error) {
      options.reporter?.error?.("Gemini authentication failed", error);
      throw error;
    }

    if (resolvedModel) {
      config.setModel(resolvedModel);
    }

    await config.initialize();
    const client = config.getGeminiClient();

    if (resolvedThinkingLevel) {
      this.monkeyPatchGeminiClient(
        client,
        resolvedModel ?? "",
        resolvedThinkingLevel
      );
    }
    const session: ActiveSession = {
      sessionId,
      createdAt: Date.now(),
      eventEmitter,
      config,
      client,
      workspacePath,
      status: "idle",
      abortController: null,
      reporter: options.reporter,
      logger: options.logger ?? undefined,
    };

    session.logger?.start(sessionId);
    this.sessions.set(sessionId, session);

    this.emitEvents(session, [
      {
        type: "system",
        provider: "gemini",
        content: `Gemini session initialized (model: ${config.getModel()}).`,
      },
    ]);
    let resolvedSessionId: string = sessionId;
    const providerSessionId = config.getSessionId();
    if (providerSessionId && providerSessionId.length > 0) {
      resolvedSessionId = this.promoteSessionId(
        sessionId,
        providerSessionId,
        session
      );
    } else {
      session.logger?.renameSession?.(sessionId, sessionId);
    }
    queueMicrotask(() => {
      eventEmitter.emit("realSessionId", resolvedSessionId);
      if (
        providerSessionId &&
        providerSessionId.length > 0 &&
        providerSessionId !== sessionId
      ) {
        eventEmitter.emit("sessionIdChanged", {
          oldId: sessionId,
          newId: resolvedSessionId,
          provider: "gemini",
        });
      }
    });

    return { sessionId: resolvedSessionId, session };
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = this.requireSession(sessionId);
    session.reporter?.info?.("Gemini sendMessage called", {
      sessionId,
      actualSessionId: session.sessionId,
      contentLength: content.length,
      status: session.status,
    });
    if (session.status === "streaming") {
      throw new Error("Gemini session already has an in-flight request.");
    }
    if (session.status === "closed") {
      throw new Error("Gemini session is closed.");
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      throw new Error("Cannot send empty Gemini prompt.");
    }

    const promptId = randomUUID();
    const abortController = new AbortController();
    session.abortController = abortController;
    session.status = "streaming";

    const timestamp = new Date().toISOString();
    session.eventEmitter.emit("message", {
      type: "turn_started",
      provider: "gemini",
      sessionId: session.sessionId,
      uuid: `${randomUUID()}::turn_started`,
      timestamp,
      data: {
        promptId,
      },
    });
    session.logger?.logUserInput({
      promptId,
      content: trimmed,
      timestamp,
    });

    this.emitEvents(session, [
      {
        type: "user_input",
        provider: "gemini",
        content: trimmed,
        data: {
          promptId,
          timestamp,
        },
      },
    ]);

    let didComplete = false;
    try {
      const result = await this.processTurns({
        session,
        parts: [{ text: trimmed }],
        promptId,
        signal: abortController.signal,
        depth: 0,
      });

      if (result.depthExceeded) {
        this.emitEvents(session, [
          {
            type: "system",
            provider: "gemini",
            content:
              "Exceeded maximum tool execution chain depth. Stopping conversation.",
          },
        ]);
      }

      const finalText = result.text.trim();
      const finalCitations = [...result.citations];

      session.logger?.logEvent({
        type: "assistant_response",
        promptId,
        content: finalText,
        citations: finalCitations,
      });

      this.emitEvents(session, [
        {
          type: "assistant",
          provider: "gemini",
          content: finalText,
          data: {
            promptId,
            usage: result.usage,
            citations: finalCitations,
          },
        },
      ]);
      didComplete = true;
    } catch (error) {
      session.logger?.logError({
        error,
        promptId,
        stage: "send",
      });
      this.emitEvents(session, [
        {
          type: "error",
          provider: "gemini",
          content: error instanceof Error ? error.message : String(error),
        },
      ]);
      throw error;
    } finally {
      if (session.abortController && !session.abortController.signal.aborted) {
        session.abortController.abort();
      }
      session.abortController = null;
      session.status = "idle";
      if (didComplete) {
        session.eventEmitter.emit("message", {
          type: "turn_completed",
          provider: "gemini",
          sessionId: session.sessionId,
          uuid: `${randomUUID()}::turn_completed`,
          timestamp: new Date().toISOString(),
          data: {
            promptId,
          },
        });
      }
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const resolvedSessionId = this.sessionAliases.get(sessionId) ?? sessionId;
    const session = this.sessions.get(resolvedSessionId);
    if (!session) {
      return;
    }

    session.status = "closing";
    session.abortController?.abort();

    try {
      await session.client.resetChat();
    } catch (error) {
      session.reporter?.warn?.("Failed to reset Gemini chat", {
        message: error instanceof Error ? error.message : String(error),
      });
    }

    session.logger?.end();
    session.status = "closed";
    this.sessions.delete(resolvedSessionId);
    this.pruneAliasesForSession(resolvedSessionId);
    this.emitEvents(session, [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini session closed.",
      },
    ]);
  }

  private promoteSessionId(
    previousId: string,
    nextId: string,
    session: ActiveSession
  ): string {
    if (nextId === previousId) {
      session.sessionId = nextId;
      session.logger?.renameSession?.(previousId, nextId);
      return nextId;
    }
    this.sessionAliases.set(previousId, nextId);
    this.sessions.delete(previousId);
    session.sessionId = nextId;
    this.sessions.set(nextId, session);
    session.logger?.renameSession?.(previousId, nextId);
    return nextId;
  }

  private async processTurns(
    context: ProcessTurnContext
  ): Promise<ConversationResult> {
    const { session, parts, promptId, signal, depth } = context;
    if (depth >= MAX_TOOL_CALL_CHAIN_DEPTH) {
      return {
        text: "",
        citations: [],
        usage: undefined,
        depthExceeded: true,
      };
    }

    const turnResult = await this.runTurn(session, parts, promptId, signal);
    let responseText = turnResult.responseText;
    let citations = [...turnResult.citations];
    let usage = turnResult.usage;
    let depthExceeded = false;

    if (turnResult.toolRequests.length === 0) {
      return {
        text: responseText,
        citations,
        usage,
        depthExceeded,
      };
    }

    const outcome = await this.executeToolCalls(
      session,
      turnResult.toolRequests,
      signal
    );
    this.emitEvents(session, outcome.events);

    try {
      const model =
        session.client.getCurrentSequenceModel() ?? session.config.getModel();
      session.client
        .getChat()
        .recordCompletedToolCalls(model, outcome.completedCalls);
    } catch (error) {
      session.reporter?.warn?.("Failed to record Gemini tool calls", {
        message: error instanceof Error ? error.message : String(error),
      });
    }

    const nextParts =
      outcome.parts.length > 0
        ? outcome.parts
        : [
            {
              text: TOOL_RESPONSE_FALLBACK,
            },
          ];

    const nested = await this.processTurns({
      session,
      parts: nextParts,
      promptId,
      signal,
      depth: depth + 1,
    });

    responseText += nested.text;
    citations = citations.concat(nested.citations);
    usage = nested.usage ?? usage;
    depthExceeded = nested.depthExceeded;

    return {
      text: responseText,
      citations,
      usage,
      depthExceeded,
    };
  }

  private async runTurn(
    session: ActiveSession,
    parts: readonly Part[],
    promptId: string,
    signal: AbortSignal
  ): Promise<GeminiTurnResult> {
    const messageProcessor = new GeminiMessageProcessor({
      reporter: session.reporter,
      modules: this.modules,
    });
    const accumulator = messageProcessor.createAccumulator(promptId);

    const stream = session.client.sendMessageStream(
      Array.from(parts) as Part[],
      signal,
      promptId
    );

    for await (const event of stream as AsyncGenerator<ServerGeminiStreamEvent>) {
      const outcome = messageProcessor.handleEvent(session, event, accumulator);
      this.emitEvents(session, outcome.events);
    }

    return messageProcessor.finalize(accumulator);
  }

  private async executeToolCalls(
    session: ActiveSession,
    requests: readonly ToolCallRequestInfo[],
    signal: AbortSignal
  ): Promise<ToolExecutionOutcome> {
    const events: GeminiSessionEvent[] = [];
    const responseParts: Part[] = [];
    const completedCalls: CompletedToolCall[] = [];

    for (const request of requests) {
      session.logger?.logEvent({
        type: "tool_execution_start",
        tool: request.name,
        callId: request.callId,
      });

      events.push({
        type: "system",
        provider: "gemini",
        content: `Executing tool "${request.name}" (call ${request.callId}).`,
        data: {
          callId: request.callId,
          tool: request.name,
          args: request.args,
        },
      });

      try {
        const completedCall = await this.toolExecutorFacade.execute(
          session.config,
          request,
          signal
        );
        completedCalls.push(completedCall);

        const toolResponse = completedCall.response;
        if (Array.isArray(toolResponse?.responseParts)) {
          responseParts.push(...toolResponse.responseParts);
        } else if (typeof toolResponse?.resultDisplay === "string") {
          responseParts.push({ text: toolResponse.resultDisplay });
        }

        events.push({
          type: "system",
          provider: "gemini",
          content: toolResponse?.error
            ? `Tool "${request.name}" returned an error.`
            : `Tool "${request.name}" completed successfully.`,
          data: {
            callId: request.callId,
            status: completedCall.status,
            error: toolResponse?.error,
          },
        });

        if (toolResponse?.error) {
          session.logger?.logError({
            error: toolResponse.error,
            callId: request.callId,
            tool: request.name,
          });
        } else {
          session.logger?.logEvent({
            type: "tool_execution_complete",
            tool: request.name,
            callId: request.callId,
          });
        }
      } catch (error) {
        session.logger?.logError({
          error,
          promptId: request.callId,
          stage: "tool",
        });
        events.push({
          type: "error",
          provider: "gemini",
          content: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      parts: responseParts,
      events,
      completedCalls,
    };
  }

  private emitEvents(
    session: ActiveSession,
    events: readonly GeminiSessionEvent[]
  ): void {
    if (events.length === 0) {
      return;
    }
    for (const event of events) {
      if (GeminiSessionManager.ALLOWED_EVENT_TYPES.has(event.type)) {
        session.eventEmitter.emit("message", event);
      }
    }
  }

  private static readonly ALLOWED_EVENT_TYPES = new Set<
    GeminiSessionEvent["type"]
  >(["assistant"]);

  private sanitizeEnvironment(): void {
    for (const key of GEMINI_ENV_KEYS_TO_CLEAR) {
      if (key in process.env) {
        delete process.env[key];
      }
    }
  }

  private resolveAuthType(selected?: string): AuthTypeEnum {
    const { AuthType } = this.modules.contentGenerator;
    switch (selected) {
      case AuthType.LOGIN_WITH_GOOGLE:
      case "oauth-personal":
      case "login_with_google":
        return AuthType.LOGIN_WITH_GOOGLE;
      case AuthType.USE_GEMINI:
      case "gemini-api-key":
        return AuthType.USE_GEMINI;
      case AuthType.USE_VERTEX_AI:
      case "vertex-ai":
        return AuthType.USE_VERTEX_AI;
      case AuthType.LEGACY_CLOUD_SHELL:
      case "cloud-shell":
        return AuthType.LEGACY_CLOUD_SHELL;
      default:
        return AuthType.LOGIN_WITH_GOOGLE;
    }
  }

  private createArgv(options: SessionCreationOptions): CliArgs {
    const includeDirectories = Array.from(
      new Set(
        [path.join(homedir(), ".codeai-hub", "templates")].map((directory) =>
          path.resolve(directory)
        )
      )
    );
    return {
      query: undefined,
      model: options.defaultModel,
      sandbox: undefined,
      debug: options.logger !== undefined,
      prompt: undefined,
      promptInteractive: undefined,
      yolo: true,
      approvalMode: "yolo",
      allowedMcpServerNames: undefined,
      allowedTools: undefined,
      experimentalAcp: false,
      extensions: undefined,
      listExtensions: false,
      resume: undefined,
      listSessions: false,
      deleteSession: undefined,
      includeDirectories,
      screenReader: undefined,
      useSmartEdit: undefined,
      useWriteTodos: undefined,
      outputFormat: "json",
      fakeResponses: undefined,
      recordResponses: undefined,
      thinkingLevel: options.thinkingLevel,
      // biome-ignore lint/suspicious/noExplicitAny: custom property thinkingLevel
    } as any as CliArgs;
  }

  private requireSession(sessionId: string): ActiveSession {
    const session = this.sessions.get(sessionId);
    if (session) {
      return session;
    }

    const canonicalId = this.sessionAliases.get(sessionId);
    if (canonicalId) {
      const resolved = this.sessions.get(canonicalId);
      if (resolved) {
        return resolved;
      }
      this.sessionAliases.delete(sessionId);
    }

    // Fallback: search by internal sessionId property
    for (const candidate of this.sessions.values()) {
      if (candidate.sessionId === sessionId) {
        return candidate;
      }
    }

    const availableIds = Array.from(this.sessions.keys()).join(", ");
    const aliasIds = Array.from(this.sessionAliases.keys()).join(", ");
    throw new Error(
      `Gemini session ${sessionId} not found. Available: [${availableIds}] Aliases: [${aliasIds}]`
    );
  }

  private pruneAliasesForSession(sessionId: string): void {
    for (const [alias, canonical] of this.sessionAliases.entries()) {
      if (alias === sessionId || canonical === sessionId) {
        this.sessionAliases.delete(alias);
      }
    }
  }

  private loadSettingsSnapshot(
    settingsPath?: string
  ): GeminiSettingsSnapshot | null {
    if (!settingsPath) {
      return null;
    }
    try {
      const raw = readFileSync(settingsPath, "utf8");
      return JSON.parse(raw) as GeminiSettingsSnapshot;
    } catch {
      return null;
    }
  }

  private resolveDefaultModelFromSnapshot(
    snapshot: GeminiSettingsSnapshot | null
  ): string | undefined {
    const candidate = snapshot?.providers?.gemini?.defaultModel;

    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }

    return;
  }

  private resolveThinkingLevelFromSnapshot(
    snapshot: GeminiSettingsSnapshot | null,

    modelId: string
  ): string | undefined {
    const candidate =
      snapshot?.providers?.gemini?.thinkingLevelByModel?.[modelId];

    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }

    return;
  }

  private monkeyPatchGeminiClient(
    // biome-ignore lint/suspicious/noExplicitAny: library client typing is not exposed here
    client: any,
    modelId: string,
    level: string
  ): void {
    if (!client || typeof client.startChat !== "function") {
      return;
    }

    const originalStartChat = client.startChat.bind(client);

    // biome-ignore lint/suspicious/noExplicitAny: overriding library method
    client.startChat = async (...args: any[]) => {
      const chat = await originalStartChat(...args);

      if (chat?.generationConfig) {
        const thinkingConfig = this.resolveThinkingConfig(modelId, level);
        if (thinkingConfig) {
          chat.generationConfig.thinkingConfig = thinkingConfig;
        }
      }
      return chat;
    };
  }

  private resolveThinkingConfig(
    modelId: string,
    level: string
  ):
    | {
        includeThoughts: boolean;
        thinkingBudget?: number;
        thinkingLevel?: string;
      }
    | undefined {
    if (modelId.startsWith("gemini-2.5-")) {
      // Gemini 2.5 family uses thinkingBudget
      let budget = 0;
      switch (level) {
        case "low":
          budget = 4000;
          break;
        case "high":
          budget = 16_000;
          break;
        default:
          budget = 4000; // Default to specific budget if unknown, to be safe
          break;
      }

      return {
        includeThoughts: budget > 0,
        thinkingBudget: budget,
      };
    }

    if (modelId.startsWith("gemini-3-") && level && level !== "off") {
      // Gemini 3 family uses thinkingLevel
      return {
        includeThoughts: true,
        thinkingLevel: level,
      };
    }

    return;
  }
}

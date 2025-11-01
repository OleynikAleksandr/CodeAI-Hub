import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
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
import type { GeminiSessionEvent } from "../types";
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

export class GeminiSessionManager {
  private readonly sessions = new Map<string, ActiveSession>();

  private readonly modules: GeminiCliModules;

  constructor(modules: GeminiCliModules) {
    this.modules = modules;
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

    const settings = this.modules.settings.loadSettings(workspacePath);
    this.modules.settings.migrateDeprecatedSettings(settings, workspacePath);

    const argv = this.createArgv(options);
    const extensionRoot =
      this.modules.extension.ExtensionStorage.getUserExtensionsDir();
    const ExtensionEnablementManagerClass = this.modules.extensionEnablement
      .ExtensionEnablementManager as unknown as new (
      configDir: string,
      enabledExtensionNames?: string[]
    ) => unknown;
    const extensionManager = new ExtensionEnablementManagerClass(extensionRoot);

    type LoadCliConfigFn = (
      ...args: [
        cliSettings: unknown,
        extensionList: unknown[],
        enablementManager: unknown,
        sessionIdentifier: string,
        cliArgs: CliArgs,
        cwd?: string,
      ]
    ) => ReturnType<typeof this.modules.config.loadCliConfig>;

    const loadCliConfig = this.modules.config
      .loadCliConfig as unknown as LoadCliConfigFn;

    const config = await loadCliConfig(
      settings.merged,
      [],
      extensionManager,
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

    if (options.defaultModel) {
      config.setModel(options.defaultModel);
    }

    await config.initialize();
    const client = config.getGeminiClient();

    const eventEmitter = new EventEmitter();
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
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
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
    this.sessions.delete(sessionId);
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
        const completedCall = await this.modules.toolExecutor.executeToolCall(
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
      session.eventEmitter.emit("message", event);
    }
  }

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
      case AuthType.CLOUD_SHELL:
      case "cloud-shell":
        return AuthType.CLOUD_SHELL;
      default:
        return AuthType.LOGIN_WITH_GOOGLE;
    }
  }

  private createArgv(options: SessionCreationOptions): CliArgs {
    return {
      query: undefined,
      model: options.defaultModel,
      sandbox: undefined,
      debug: options.logger !== undefined,
      prompt: undefined,
      promptInteractive: undefined,
      yolo: false,
      approvalMode: undefined,
      allowedMcpServerNames: undefined,
      allowedTools: undefined,
      experimentalAcp: false,
      extensions: undefined,
      listExtensions: false,
      includeDirectories: [],
      screenReader: undefined,
      useSmartEdit: undefined,
      useWriteTodos: undefined,
      outputFormat: "json",
    } as CliArgs;
  }

  private requireSession(sessionId: string): ActiveSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Gemini session ${sessionId} not found`);
    }
    return session;
  }
}

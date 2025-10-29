import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import {
  type CliArgs,
  loadCliConfig,
} from "@google/gemini-cli/dist/src/config/config.js";
import {
  loadSettings,
  migrateDeprecatedSettings,
} from "@google/gemini-cli/dist/src/config/settings.js";
import { AuthType } from "@google/gemini-cli-core/dist/src/core/contentGenerator.js";
import type { CompletedToolCall } from "@google/gemini-cli-core/dist/src/core/coreToolScheduler.js";
import { executeToolCall } from "@google/gemini-cli-core/dist/src/core/nonInteractiveToolExecutor.js";
import type {
  ServerGeminiStreamEvent,
  ToolCallRequestInfo,
} from "@google/gemini-cli-core/dist/src/core/turn.js";
import type { Part, UsageMetadata } from "@google/genai";
import { GeminiMessageProcessor } from "../messaging/message-processor.js";
import type { GeminiSessionEvent } from "../types/index.js";
import type {
  ActiveSession,
  SessionCreationOptions,
  SessionCreationResult,
} from "./types.js";

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

  constructor() {
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

    const settings = loadSettings(workspacePath);
    migrateDeprecatedSettings(settings, workspacePath);

    const argv = this.createArgv(options);
    const config = await loadCliConfig(
      settings.merged,
      [],
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
    eventEmitter.emit("realSessionId", config.getSessionId());

    return { sessionId, session };
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

  private async runTurn(
    session: ActiveSession,
    parts: readonly Part[],
    promptId: string,
    signal: AbortSignal
  ): Promise<GeminiTurnResult> {
    const messageProcessor = new GeminiMessageProcessor({
      reporter: session.reporter,
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

      const completedCall = await executeToolCall(
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
    }

    return {
      parts: responseParts,
      events,
      completedCalls,
    };
  }

  private sanitizeEnvironment(): void {
    for (const key of GEMINI_ENV_KEYS_TO_CLEAR) {
      if (process.env[key]) {
        delete process.env[key];
      }
    }
  }

  private createArgv(options: SessionCreationOptions): CliArgs {
    return {
      query: undefined,
      model: options.defaultModel,
      sandbox: undefined,
      debug: false,
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
    };
  }

  private resolveAuthType(selected?: string): AuthType {
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

  private emitEvents(
    session: ActiveSession,
    events: readonly GeminiSessionEvent[]
  ): void {
    for (const event of events) {
      session.eventEmitter.emit("message", event);
    }
  }

  private requireSession(sessionId: string): ActiveSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Gemini session ${sessionId} not found.`);
    }
    return session;
  }
}

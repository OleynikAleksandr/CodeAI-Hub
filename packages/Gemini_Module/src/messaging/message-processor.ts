import crypto from "node:crypto";
import type {
  GeminiEventType,
  ServerGeminiStreamEvent,
  ToolCallRequestInfo,
} from "@google/gemini-cli-core/dist/src/core/turn";
import type { ThoughtSummary } from "@google/gemini-cli-core/dist/src/utils/thoughtUtils";
import type { UsageMetadata } from "@google/genai";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { ActiveSession } from "../session/types";
import type { GeminiSessionEvent, ModuleReporter } from "../types";
import type { ThoughtTranslatorService } from "./thought-translator-service";

type TurnAccumulator = {
  readonly promptId: string;
  currentAssistantChunks: string[];
  responseChunks: string[];
  citations: string[];
  toolRequests: ToolCallRequestInfo[];
  usage?: UsageMetadata;
};

type HandleEventOutcome = {
  readonly events: readonly GeminiSessionEvent[];
};

type GeminiMessageProcessorOptions = {
  readonly reporter?: ModuleReporter;
  readonly modules: GeminiCliModules;
  readonly thoughtTranslator?: ThoughtTranslatorService;
};

type EventHandler = (
  session: ActiveSession,
  event: ServerGeminiStreamEvent,
  accumulator: TurnAccumulator
) => readonly GeminiSessionEvent[];

const readNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const trySerializeValue = (value: unknown): string | null => {
  try {
    const serialized = JSON.stringify(value);
    return serialized.length > 0 ? serialized : null;
  } catch {
    return null;
  }
};

export const formatGeminiStreamErrorMessage = (
  value: unknown
): string | null => {
  if (value instanceof Error) {
    return readNonEmptyString(value.message);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  const directMessage = readNonEmptyString(record.message);
  if (directMessage) {
    return directMessage;
  }

  const errorValue = record.error;
  const errorMessage = readNonEmptyString(errorValue);
  if (errorMessage) {
    return errorMessage;
  }

  if (errorValue && typeof errorValue === "object") {
    const errorRecord = errorValue as Record<string, unknown>;
    const nestedMessage = readNonEmptyString(errorRecord.message);
    if (nestedMessage) {
      return nestedMessage;
    }
    return trySerializeValue(errorValue);
  }

  return null;
};

export class GeminiMessageProcessor {
  private readonly reporter?: ModuleReporter;

  private readonly modules: GeminiCliModules;

  private readonly thoughtTranslator?: ThoughtTranslatorService;

  private readonly eventHandlers: Map<GeminiEventType, EventHandler>;

  constructor(options: GeminiMessageProcessorOptions) {
    this.reporter = options.reporter;
    this.modules = options.modules;
    this.thoughtTranslator = options.thoughtTranslator;
    const { GeminiEventType: TurnEventType } = this.modules.turn;
    this.eventHandlers = new Map<GeminiEventType, EventHandler>([
      [TurnEventType.Content, this.handleContentEvent.bind(this)],
      [TurnEventType.Citation, this.handleCitationEvent.bind(this)],
      [
        TurnEventType.ToolCallRequest,
        this.handleToolCallRequestEvent.bind(this),
      ],
      [
        TurnEventType.ToolCallResponse,
        this.handleToolCallResponseEvent.bind(this),
      ],
      [
        TurnEventType.ToolCallConfirmation,
        this.handleToolCallConfirmationEvent.bind(this),
      ],
      [TurnEventType.ChatCompressed, this.handleChatCompressedEvent.bind(this)],
      [
        TurnEventType.ContextWindowWillOverflow,
        this.handleContextOverflowEvent.bind(this),
      ],
      [TurnEventType.Retry, this.handleRetryEvent.bind(this)],
      [TurnEventType.Thought, this.handleThoughtEvent.bind(this)],
      [
        TurnEventType.MaxSessionTurns,
        this.handleMaxSessionTurnsEvent.bind(this),
      ],
      [TurnEventType.LoopDetected, this.handleLoopDetectedEvent.bind(this)],
      [TurnEventType.InvalidStream, this.handleInvalidStreamEvent.bind(this)],
      [TurnEventType.Finished, this.handleFinishedEvent.bind(this)],
    ]);
    // Events added in gemini-cli-core@0.35.0 — may not exist in older type defs,
    // so we register via runtime enum lookup with string fallback.
    const enumRecord = TurnEventType as unknown as Record<string, string>;
    this.eventHandlers.set(
      (enumRecord.ModelInfo ?? "model_info") as GeminiEventType,
      this.handleModelInfoEvent.bind(this)
    );
    this.eventHandlers.set(
      (enumRecord.AgentExecutionStopped ??
        "agent_execution_stopped") as GeminiEventType,
      this.handleAgentExecutionStoppedEvent.bind(this)
    );
    this.eventHandlers.set(
      (enumRecord.AgentExecutionBlocked ??
        "agent_execution_blocked") as GeminiEventType,
      this.handleAgentExecutionBlockedEvent.bind(this)
    );
  }

  createAccumulator(promptId: string): TurnAccumulator {
    return {
      promptId,
      currentAssistantChunks: [],
      responseChunks: [],
      citations: [],
      toolRequests: [],
    };
  }

  handleEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): HandleEventOutcome {
    session.logger?.logRawEvent(event);

    const handler = this.eventHandlers.get(event.type as GeminiEventType);
    if (handler) {
      return { events: handler(session, event, accumulator) };
    }

    const { GeminiEventType: TurnEventType } = this.modules.turn;
    if (event.type === TurnEventType.Error) {
      throw this.toError(event.value);
    }

    if (event.type === TurnEventType.UserCancelled) {
      throw new Error("Gemini cancelled the request.");
    }

    return { events: [] };
  }

  finalize(accumulator: TurnAccumulator): {
    readonly responseText: string;
    readonly citations: readonly string[];
    readonly usage?: UsageMetadata;
    readonly toolRequests: readonly ToolCallRequestInfo[];
  } {
    return {
      responseText: accumulator.responseChunks.join(""),
      citations: accumulator.citations,
      usage: accumulator.usage,
      toolRequests: accumulator.toolRequests,
    };
  }

  private handleContentEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    const chunk = typeof value === "string" ? value : "";
    if (chunk.length > 0) {
      accumulator.currentAssistantChunks.push(chunk);
      accumulator.responseChunks.push(chunk);
      session.logger?.logEvent({ direction: "incoming", chunk });
    }
    return [];
  }

  private handleCitationEvent(
    _session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    if (typeof value === "string") {
      accumulator.citations.push(value);
    }
    return [];
  }

  private handleToolCallRequestEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    if (!this.isToolCallRequestInfo(value)) {
      return [];
    }

    accumulator.toolRequests.push(value);
    session.logger?.logEvent({
      type: "tool_call_request",
      promptId: accumulator.promptId,
      tool: value.name,
      callId: value.callId,
    });

    return [
      {
        type: "system",
        provider: "gemini",
        content: `Gemini requested tool "${value.name}" (call ${value.callId}).`,
        data: {
          callId: value.callId,
          tool: value.name,
          args: value.args,
        },
      },
    ];
  }

  private handleToolCallResponseEvent(
    _session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    return [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini received tool response.",
        data: value ? { response: value } : undefined,
      },
    ];
  }

  private handleToolCallConfirmationEvent(
    _session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    return [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini confirmed tool call.",
        data: value ? { confirmation: value } : undefined,
      },
    ];
  }

  private handleChatCompressedEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    session.logger?.logEvent({ type: "chat_compressed", payload: value });
    return [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini compressed the chat history to stay within limits.",
      },
    ];
  }

  private handleContextOverflowEvent(
    _session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    return [
      {
        type: "warning",
        provider: "gemini",
        content:
          "Gemini context window is close to overflowing. Consider clearing history.",
        data: value,
      },
    ];
  }

  private handleRetryEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    session.logger?.logEvent({ type: "retry", promptId: accumulator.promptId });
    return [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini is retrying the request due to an internal issue.",
        data: value,
      },
    ];
  }

  private handleThoughtEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    if (!this.isThoughtSummary(value)) {
      return [];
    }

    session.logger?.logEvent({
      type: "thought",
      promptId: accumulator.promptId,
      summary: value,
    });
    const formatted =
      value.subject && value.subject.trim().length > 0
        ? `${value.subject.trim()}: ${value.description}`
        : value.description;
    this.emitDialogMessage(
      session,
      "thinking",
      formatted,
      accumulator.promptId
    );
    // Fire-and-forget translation via Flash — does not block main stream
    if (this.thoughtTranslator) {
      const promptId = accumulator.promptId;
      this.thoughtTranslator
        .translateThought(value)
        .then((translated: string | null) => {
          if (translated) {
            this.emitDialogMessage(session, "assistant", translated, promptId);
          }
        })
        .catch(() => {
          // Graceful degradation: translation failure is non-blocking
        });
    }
    return [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini generated an intermediate thought.",
        data: value,
      },
    ];
  }

  private handleMaxSessionTurnsEvent(
    session: ActiveSession,
    _event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    session.logger?.logEvent({ type: "max_turns" });
    return [
      {
        type: "warning",
        provider: "gemini",
        content:
          "Gemini reached the maximum number of turns for this session. Consider starting a new session.",
      },
    ];
  }

  private handleLoopDetectedEvent(
    session: ActiveSession,
    _event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    session.logger?.logEvent({
      type: "loop_detected",
      promptId: accumulator.promptId,
    });
    return [
      {
        type: "warning",
        provider: "gemini",
        content: "Gemini detected a potential tool execution loop.",
      },
    ];
  }

  private handleInvalidStreamEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    session.logger?.logError({
      type: "invalid_stream",
      promptId: accumulator.promptId,
      payload: value,
    });
    return [
      {
        type: "error",
        provider: "gemini",
        content: "Gemini returned an invalid streaming payload.",
        data: value,
      },
    ];
  }

  private handleFinishedEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    session.logger?.logEvent({ type: "finished", payload: value });
    accumulator.usage =
      value && typeof value === "object"
        ? (value as { usageMetadata?: UsageMetadata }).usageMetadata
        : undefined;
    const assistantSegment = accumulator.currentAssistantChunks.join("");
    accumulator.currentAssistantChunks.length = 0;
    this.emitDialogMessage(
      session,
      "assistant",
      assistantSegment,
      accumulator.promptId
    );
    return [];
  }

  private handleModelInfoEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    const modelName = typeof value === "string" ? value : "unknown";
    session.logger?.logEvent({ type: "model_info", model: modelName });
    return [
      {
        type: "system",
        provider: "gemini",
        content: `Gemini model: ${modelName}`,
        data: { model: modelName },
      },
    ];
  }

  private handleAgentExecutionStoppedEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event) as {
      reason?: string;
      systemMessage?: string;
    } | null;
    const reason = value?.reason ?? "unknown";
    session.logger?.logEvent({ type: "agent_execution_stopped", reason });
    return [
      {
        type: "warning",
        provider: "gemini",
        content: `Gemini agent execution stopped: ${reason}`,
        data: value ?? undefined,
      },
    ];
  }

  private handleAgentExecutionBlockedEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event) as {
      reason?: string;
      systemMessage?: string;
    } | null;
    const reason = value?.reason ?? "unknown";
    session.logger?.logEvent({ type: "agent_execution_blocked", reason });
    return [
      {
        type: "warning",
        provider: "gemini",
        content: `Gemini agent execution blocked: ${reason}`,
        data: value ?? undefined,
      },
    ];
  }

  private getEventValue(event: ServerGeminiStreamEvent): unknown {
    return (event as { value?: unknown }).value;
  }

  private toError(value: unknown): Error {
    const message = formatGeminiStreamErrorMessage(value);
    if (typeof message === "string" && message.length > 0) {
      return new Error(message);
    }
    const fallback = new Error("Gemini reported an error.");
    this.reporter?.error?.("Gemini stream error", fallback, { payload: value });
    return fallback;
  }

  private emitDialogMessage(
    session: ActiveSession,
    role: "assistant" | "thinking" | "user",
    content: string,
    seed?: string
  ): void {
    if (!content || content.trim().length === 0) {
      return;
    }
    const uuid =
      seed && seed.length > 0
        ? `${seed}-${role}-${crypto.randomUUID()}`
        : crypto.randomUUID();
    session.eventEmitter.emit("message", {
      type: "dialog_message",
      role,
      content,
      uuid,
      timestamp: new Date().toISOString(),
    });
  }

  private isToolCallRequestInfo(value: unknown): value is ToolCallRequestInfo {
    if (!value || typeof value !== "object") {
      return false;
    }
    const record = value as Record<string, unknown>;
    return typeof record.callId === "string" && typeof record.name === "string";
  }

  private isThoughtSummary(value: unknown): value is ThoughtSummary {
    return Boolean(
      value &&
        typeof value === "object" &&
        "description" in value &&
        "subject" in value
    );
  }
}

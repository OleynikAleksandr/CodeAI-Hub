import {
  GeminiEventType,
  type ServerGeminiStreamEvent,
  type ToolCallRequestInfo,
} from "@google/gemini-cli-core/dist/src/core/turn.js";
import type { ThoughtSummary } from "@google/gemini-cli-core/dist/src/utils/thoughtUtils.js";
import type { UsageMetadata } from "@google/genai";
import type { ActiveSession } from "../session/types.js";
import type { GeminiSessionEvent, ModuleReporter } from "../types/index.js";

type TurnAccumulator = {
  readonly promptId: string;
  responseChunks: string[];
  citations: string[];
  toolRequests: ToolCallRequestInfo[];
  usage?: UsageMetadata;
};

type HandleEventOutcome = {
  readonly events: readonly GeminiSessionEvent[];
};

type GeminiTurnEvent = ServerGeminiStreamEvent;

type GeminiMessageProcessorOptions = {
  readonly reporter?: ModuleReporter;
};

type EventHandler = (
  session: ActiveSession,
  event: ServerGeminiStreamEvent,
  accumulator: TurnAccumulator
) => readonly GeminiSessionEvent[];

export class GeminiMessageProcessor {
  private readonly reporter?: ModuleReporter;

  private readonly eventHandlers: Map<GeminiEventType, EventHandler>;

  constructor(options: GeminiMessageProcessorOptions = {}) {
    this.reporter = options.reporter;
    this.eventHandlers = new Map<GeminiEventType, EventHandler>([
      [GeminiEventType.Content, this.handleContentEvent.bind(this)],
      [GeminiEventType.Citation, this.handleCitationEvent.bind(this)],
      [
        GeminiEventType.ToolCallRequest,
        this.handleToolCallRequestEvent.bind(this),
      ],
      [
        GeminiEventType.ToolCallResponse,
        this.handleToolCallResponseEvent.bind(this),
      ],
      [
        GeminiEventType.ToolCallConfirmation,
        this.handleToolCallConfirmationEvent.bind(this),
      ],
      [
        GeminiEventType.ChatCompressed,
        this.handleChatCompressedEvent.bind(this),
      ],
      [
        GeminiEventType.ContextWindowWillOverflow,
        this.handleContextOverflowEvent.bind(this),
      ],
      [GeminiEventType.Retry, this.handleRetryEvent.bind(this)],
      [GeminiEventType.Thought, this.handleThoughtEvent.bind(this)],
      [
        GeminiEventType.MaxSessionTurns,
        this.handleMaxSessionTurnsEvent.bind(this),
      ],
      [GeminiEventType.LoopDetected, this.handleLoopDetectedEvent.bind(this)],
      [GeminiEventType.InvalidStream, this.handleInvalidStreamEvent.bind(this)],
      [GeminiEventType.Finished, this.handleFinishedEvent.bind(this)],
    ]);
  }

  createAccumulator(promptId: string): TurnAccumulator {
    return {
      promptId,
      responseChunks: [],
      citations: [],
      toolRequests: [],
    };
  }

  handleEvent(
    session: ActiveSession,
    event: GeminiTurnEvent,
    accumulator: TurnAccumulator
  ): HandleEventOutcome {
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      return { events: handler(session, event, accumulator) };
    }

    if (event.type === GeminiEventType.Error) {
      throw this.toError(event.value);
    }

    if (event.type === GeminiEventType.UserCancelled) {
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
        content: "Gemini confirmed tool execution.",
        data: value ? { confirmation: value } : undefined,
      },
    ];
  }

  private handleChatCompressedEvent(
    _session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    return [
      {
        type: "system",
        provider: "gemini",
        content:
          "Gemini compressed conversation context to remain within token limits.",
        data: value ? { compression: value } : undefined,
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
        type: "system",
        provider: "gemini",
        content: "Gemini detected the context window is nearly full.",
        data: value ? { context: value } : undefined,
      },
    ];
  }

  private handleRetryEvent(
    _session: ActiveSession,
    _event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    accumulator.responseChunks = [];
    return [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini is retrying the request due to stream inconsistency.",
      },
    ];
  }

  private handleThoughtEvent(
    _session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    if (!value || typeof value !== "object") {
      return [];
    }
    const thought = value as ThoughtSummary;
    const description =
      typeof thought.description === "string" ? thought.description : undefined;
    const subject =
      typeof thought.subject === "string" ? thought.subject : undefined;
    const content = subject
      ? `Gemini shared a thought: ${subject}`
      : "Gemini shared an intermediate thought.";
    return [
      {
        type: "system",
        provider: "gemini",
        content,
        data: {
          subject,
          description,
        },
      },
    ];
  }

  private handleMaxSessionTurnsEvent(): readonly GeminiSessionEvent[] {
    return [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini reached the maximum allowed session turns.",
      },
    ];
  }

  private handleLoopDetectedEvent(): readonly GeminiSessionEvent[] {
    return [
      {
        type: "system",
        provider: "gemini",
        content:
          "Gemini detected a potential instruction loop and stopped the turn.",
      },
    ];
  }

  private handleInvalidStreamEvent(): readonly GeminiSessionEvent[] {
    return [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini reported an invalid stream and will retry.",
      },
    ];
  }

  private handleFinishedEvent(
    _session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const value = this.getEventValue(event);
    const metadata =
      typeof value === "object" && value
        ? (value as { usageMetadata?: UsageMetadata }).usageMetadata
        : undefined;
    accumulator.usage = metadata;
    return [];
  }

  private isToolCallRequestInfo(
    candidate: unknown
  ): candidate is ToolCallRequestInfo {
    if (!candidate || typeof candidate !== "object") {
      return false;
    }
    const record = candidate as Record<string, unknown>;
    return typeof record.callId === "string" && typeof record.name === "string";
  }

  private toError(payload: unknown): Error {
    if (payload && typeof payload === "object" && "error" in payload) {
      const raw = (payload as { error?: unknown }).error;
      if (raw && typeof raw === "object" && "message" in raw) {
        const message = String((raw as { message?: unknown }).message ?? "");
        return new Error(
          message.length > 0 ? message : "Gemini reported an error."
        );
      }
    }
    const fallback = new Error("Gemini reported an unknown error.");
    this.reporter?.error?.("Gemini stream error", fallback, {
      payload,
    });
    return fallback;
  }

  private getEventValue(event: ServerGeminiStreamEvent): unknown {
    return (event as { value?: unknown }).value;
  }
}

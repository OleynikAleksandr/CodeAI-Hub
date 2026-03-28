import type {
  GeminiEventType,
  ServerGeminiStreamEvent,
} from "@google/gemini-cli-core/dist/src/core/turn";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { ActiveSession } from "../session/types";
import type { GeminiSessionEvent, ModuleReporter } from "../types";
import type {
  GeminiAssistantEventNormalizer,
  TurnAccumulator,
} from "./gemini-assistant-event-normalizer";
import { formatGeminiStreamErrorMessage } from "./gemini-stream-error";
import type { GeminiSystemEventNormalizer } from "./gemini-system-event-normalizer";

type EventHandler = (
  session: ActiveSession,
  event: ServerGeminiStreamEvent,
  accumulator: TurnAccumulator
) => readonly GeminiSessionEvent[];

export class GeminiStreamEventRouter {
  private readonly assistantNormalizer: GeminiAssistantEventNormalizer;
  private readonly eventHandlers: Map<GeminiEventType, EventHandler>;
  private readonly modules: GeminiCliModules;
  private readonly reporter?: ModuleReporter;
  private readonly systemNormalizer: GeminiSystemEventNormalizer;

  constructor(options: {
    readonly assistantNormalizer: GeminiAssistantEventNormalizer;
    readonly modules: GeminiCliModules;
    readonly reporter?: ModuleReporter;
    readonly systemNormalizer: GeminiSystemEventNormalizer;
  }) {
    this.assistantNormalizer = options.assistantNormalizer;
    this.modules = options.modules;
    this.reporter = options.reporter;
    this.systemNormalizer = options.systemNormalizer;

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

  handleEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const handler = this.eventHandlers.get(event.type as GeminiEventType);
    if (handler) {
      return handler(session, event, accumulator);
    }

    const { GeminiEventType: TurnEventType } = this.modules.turn;
    if (event.type === TurnEventType.Error) {
      throw this.toError(this.getEventValue(event));
    }
    if (event.type === TurnEventType.UserCancelled) {
      throw new Error("Gemini cancelled the request.");
    }
    return [];
  }

  private handleContentEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.assistantNormalizer.handleContentEvent(
      session,
      this.getEventValue(event),
      accumulator
    );
  }

  private handleCitationEvent(
    _session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleCitationEvent(
      this.getEventValue(event),
      accumulator
    );
  }

  private handleToolCallRequestEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleToolCallRequestEvent(
      session,
      this.getEventValue(event),
      accumulator
    );
  }

  private handleToolCallResponseEvent(
    _session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleToolCallResponseEvent(
      this.getEventValue(event)
    );
  }

  private handleToolCallConfirmationEvent(
    _session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleToolCallConfirmationEvent(
      this.getEventValue(event)
    );
  }

  private handleChatCompressedEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleChatCompressedEvent(
      session,
      this.getEventValue(event)
    );
  }

  private handleContextOverflowEvent(
    _session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleContextOverflowEvent(
      this.getEventValue(event)
    );
  }

  private handleRetryEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleRetryEvent(
      session,
      this.getEventValue(event),
      accumulator
    );
  }

  private handleThoughtEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.assistantNormalizer.handleThoughtEvent(
      session,
      this.getEventValue(event),
      accumulator
    );
  }

  private handleMaxSessionTurnsEvent(
    session: ActiveSession,
    _event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleMaxSessionTurnsEvent(session);
  }

  private handleLoopDetectedEvent(
    session: ActiveSession,
    _event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleLoopDetectedEvent(session, accumulator);
  }

  private handleInvalidStreamEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleInvalidStreamEvent(
      session,
      this.getEventValue(event),
      accumulator
    );
  }

  private handleFinishedEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.assistantNormalizer.handleFinishedEvent(
      session,
      this.getEventValue(event),
      accumulator
    );
  }

  private handleModelInfoEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleModelInfoEvent(
      session,
      this.getEventValue(event)
    );
  }

  private handleAgentExecutionStoppedEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleAgentExecutionStoppedEvent(
      session,
      this.getEventValue(event)
    );
  }

  private handleAgentExecutionBlockedEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return this.systemNormalizer.handleAgentExecutionBlockedEvent(
      session,
      this.getEventValue(event)
    );
  }

  private getEventValue(event: ServerGeminiStreamEvent): unknown {
    return (event as { value?: unknown }).value;
  }

  private toError(value: unknown): Error {
    const message = formatGeminiStreamErrorMessage(value);
    if (message) {
      return new Error(message);
    }
    const fallback = new Error("Gemini reported an error.");
    this.reporter?.error?.("Gemini stream error", fallback, { payload: value });
    return fallback;
  }
}

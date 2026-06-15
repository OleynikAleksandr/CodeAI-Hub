import type { ToolCallRequestInfo } from "../runtime/gemini-cli-compat";
import type { ActiveSession } from "../session/types";
import type { GeminiSessionEvent } from "../types";
import type {
  GeminiAssistantEventNormalizer,
  TurnAccumulator,
} from "./gemini-assistant-event-normalizer";

export class GeminiSystemEventNormalizer {
  private readonly assistantEventNormalizer?: GeminiAssistantEventNormalizer;

  constructor(assistantEventNormalizer?: GeminiAssistantEventNormalizer) {
    this.assistantEventNormalizer = assistantEventNormalizer;
  }

  handleCitationEvent(
    value: unknown,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    if (typeof value === "string") {
      accumulator.citations.push(value);
    }
    return [];
  }

  handleToolCallRequestEvent(
    _session: ActiveSession,
    value: unknown,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    if (!this.isToolCallRequestInfo(value)) {
      return [];
    }

    this.assistantEventNormalizer?.snapshotPreToolAssistantSegment(accumulator);
    accumulator.toolRequests.push(value);
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

  handleToolCallResponseEvent(value: unknown): readonly GeminiSessionEvent[] {
    return [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini received tool response.",
        data: value ? { response: value } : undefined,
      },
    ];
  }

  handleToolCallConfirmationEvent(
    value: unknown
  ): readonly GeminiSessionEvent[] {
    return [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini confirmed tool call.",
        data: value ? { confirmation: value } : undefined,
      },
    ];
  }

  handleChatCompressedEvent(
    _session: ActiveSession,
    _value: unknown
  ): readonly GeminiSessionEvent[] {
    return [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini compressed the chat history to stay within limits.",
      },
    ];
  }

  handleContextOverflowEvent(value: unknown): readonly GeminiSessionEvent[] {
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

  handleRetryEvent(
    _session: ActiveSession,
    value: unknown,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini is retrying the request due to an internal issue.",
        data: value,
      },
    ];
  }

  handleMaxSessionTurnsEvent(
    _session: ActiveSession
  ): readonly GeminiSessionEvent[] {
    return [
      {
        type: "warning",
        provider: "gemini",
        content:
          "Gemini reached the maximum number of turns for this session. Consider starting a new session.",
      },
    ];
  }

  handleLoopDetectedEvent(
    _session: ActiveSession,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return [
      {
        type: "warning",
        provider: "gemini",
        content: "Gemini detected a potential tool execution loop.",
      },
    ];
  }

  handleInvalidStreamEvent(
    _session: ActiveSession,
    value: unknown,
    _accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    return [
      {
        type: "error",
        provider: "gemini",
        content: "Gemini returned an invalid streaming payload.",
        data: value,
      },
    ];
  }

  handleModelInfoEvent(
    _session: ActiveSession,
    value: unknown
  ): readonly GeminiSessionEvent[] {
    const modelName = typeof value === "string" ? value : "unknown";
    return [
      {
        type: "system",
        provider: "gemini",
        content: `Gemini model: ${modelName}`,
        data: { model: modelName },
      },
    ];
  }

  handleAgentExecutionStoppedEvent(
    _session: ActiveSession,
    value: unknown
  ): readonly GeminiSessionEvent[] {
    const reason = this.readReason(value);
    return [
      {
        type: "warning",
        provider: "gemini",
        content: `Gemini agent execution stopped: ${reason}`,
        data: value ?? undefined,
      },
    ];
  }

  handleAgentExecutionBlockedEvent(
    _session: ActiveSession,
    value: unknown
  ): readonly GeminiSessionEvent[] {
    const reason = this.readReason(value);
    return [
      {
        type: "warning",
        provider: "gemini",
        content: `Gemini agent execution blocked: ${reason}`,
        data: value ?? undefined,
      },
    ];
  }

  private isToolCallRequestInfo(value: unknown): value is ToolCallRequestInfo {
    return Boolean(
      value &&
        typeof value === "object" &&
        typeof (value as Record<string, unknown>).callId === "string" &&
        typeof (value as Record<string, unknown>).name === "string"
    );
  }

  private readReason(value: unknown): string {
    return value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).reason === "string"
      ? ((value as Record<string, unknown>).reason as string)
      : "unknown";
  }
}

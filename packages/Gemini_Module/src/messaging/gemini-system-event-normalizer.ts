import type { ToolCallRequestInfo } from "@google/gemini-cli-core/dist/src/core/turn";
import type { ActiveSession } from "../session/types";
import type { GeminiSessionEvent } from "../types";
import type { TurnAccumulator } from "./gemini-assistant-event-normalizer";

export class GeminiSystemEventNormalizer {
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
    session: ActiveSession,
    value: unknown,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
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
    session: ActiveSession,
    value: unknown
  ): readonly GeminiSessionEvent[] {
    session.logger?.logEvent({ type: "chat_compressed", payload: value });
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
    session: ActiveSession,
    value: unknown,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
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

  handleMaxSessionTurnsEvent(
    session: ActiveSession
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

  handleLoopDetectedEvent(
    session: ActiveSession,
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

  handleInvalidStreamEvent(
    session: ActiveSession,
    value: unknown,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
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

  handleModelInfoEvent(
    session: ActiveSession,
    value: unknown
  ): readonly GeminiSessionEvent[] {
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

  handleAgentExecutionStoppedEvent(
    session: ActiveSession,
    value: unknown
  ): readonly GeminiSessionEvent[] {
    const reason = this.readReason(value);
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

  handleAgentExecutionBlockedEvent(
    session: ActiveSession,
    value: unknown
  ): readonly GeminiSessionEvent[] {
    const reason = this.readReason(value);
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

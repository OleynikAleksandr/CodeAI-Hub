import crypto from "node:crypto";
import type { ToolCallRequestInfo } from "@google/gemini-cli-core/dist/src/core/turn";
import type { ThoughtSummary } from "@google/gemini-cli-core/dist/src/utils/thoughtUtils";
import type { UsageMetadata } from "@google/genai";
import type { ActiveSession } from "../session/types";
import type { GeminiSessionEvent } from "../types";
import type { ThoughtTranslatorService } from "./thought-translator-service";

export interface TurnAccumulator {
  citations: string[];
  currentAssistantChunks: string[];
  pendingTranslations: Promise<void>[];
  readonly promptId: string;
  responseChunks: string[];
  toolRequests: ToolCallRequestInfo[];
  usage?: UsageMetadata;
}

export class GeminiAssistantEventNormalizer {
  private readonly thoughtTranslator?: ThoughtTranslatorService;

  constructor(thoughtTranslator?: ThoughtTranslatorService) {
    this.thoughtTranslator = thoughtTranslator;
  }

  createAccumulator(promptId: string): TurnAccumulator {
    return {
      promptId,
      currentAssistantChunks: [],
      responseChunks: [],
      citations: [],
      toolRequests: [],
      pendingTranslations: [],
    };
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

  handleContentEvent(
    session: ActiveSession,
    value: unknown,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const chunk = typeof value === "string" ? value : "";
    if (chunk.length > 0) {
      accumulator.currentAssistantChunks.push(chunk);
      accumulator.responseChunks.push(chunk);
      session.logger?.logEvent({ direction: "incoming", chunk });
    }
    return [];
  }

  handleThoughtEvent(
    session: ActiveSession,
    value: unknown,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    if (!this.isThoughtSummary(value)) {
      return [];
    }

    session.logger?.logEvent({
      type: "thought",
      promptId: accumulator.promptId,
      summary: value,
    });
    session.logger?.logEvent({
      type: "provider_feedback",
      provider: "gemini",
      feedbackType: "thought",
      sessionId: session.sessionId,
      promptId: accumulator.promptId,
      subject: value.subject,
      description: value.description,
    });
    const formatted =
      value.subject && value.subject.trim().length > 0
        ? `${value.subject.trim()}: ${value.description}`
        : value.description;

    if (this.thoughtTranslator) {
      const pending = this.thoughtTranslator
        .translateThought(value)
        .then((translated: string | null) => {
          this.emitDialogMessage(
            session,
            "assistant",
            translated ?? formatted,
            {
              seed: accumulator.promptId,
              tag: "thinking",
            }
          );
        })
        .catch(() => {
          this.emitDialogMessage(session, "assistant", formatted, {
            seed: accumulator.promptId,
            tag: "thinking",
          });
        });
      accumulator.pendingTranslations.push(pending);
    } else {
      this.emitDialogMessage(session, "assistant", formatted, {
        seed: accumulator.promptId,
        tag: "thinking",
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

  handleFinishedEvent(
    session: ActiveSession,
    value: unknown,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    session.logger?.logEvent({ type: "finished", payload: value });
    accumulator.usage =
      value && typeof value === "object"
        ? (value as { usageMetadata?: UsageMetadata }).usageMetadata
        : undefined;
    if (typeof accumulator.usage?.thoughtsTokenCount === "number") {
      session.logger?.logEvent({
        type: "provider_feedback",
        provider: "gemini",
        feedbackType: "thought_usage",
        sessionId: session.sessionId,
        promptId: accumulator.promptId,
        thoughtsTokenCount: accumulator.usage.thoughtsTokenCount,
      });
    }

    const assistantSegment = accumulator.currentAssistantChunks.join("");
    accumulator.currentAssistantChunks.length = 0;
    if (accumulator.pendingTranslations.length > 0) {
      const pending = [...accumulator.pendingTranslations];
      accumulator.pendingTranslations.length = 0;
      Promise.allSettled(pending).then(() => {
        this.emitDialogMessage(session, "assistant", assistantSegment, {
          seed: accumulator.promptId,
        });
      });
      return [];
    }

    this.emitDialogMessage(session, "assistant", assistantSegment, {
      seed: accumulator.promptId,
    });
    return [];
  }

  private emitDialogMessage(
    session: ActiveSession,
    role: "assistant" | "thinking" | "user",
    content: string,
    options?: { readonly seed?: string; readonly tag?: string }
  ): void {
    if (!content || content.trim().length === 0) {
      return;
    }

    const uuid =
      options?.seed && options.seed.length > 0
        ? `${options.seed}-${role}-${crypto.randomUUID()}`
        : crypto.randomUUID();
    session.eventEmitter.emit("message", {
      type: "dialog_message",
      role,
      content,
      uuid,
      timestamp: new Date().toISOString(),
      ...(options?.tag ? { tag: options.tag } : {}),
    });
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

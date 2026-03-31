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
  pendingDialogMessageFlush: Promise<void>;
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
      pendingDialogMessageFlush: Promise.resolve(),
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
    const formatted =
      value.subject && value.subject.trim().length > 0
        ? `${value.subject.trim()}: ${value.description}`
        : value.description;
    const shouldDisplayThinking =
      session.runtimeTurnConfig.thinkingDisplaySyncEnabled !== false;

    if (this.thoughtTranslator) {
      const pending = this.thoughtTranslator
        .translateThought(value)
        .then((translated: string | null) => {
          if (!shouldDisplayThinking) {
            return;
          }

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
          if (!shouldDisplayThinking) {
            return;
          }

          this.emitDialogMessage(session, "assistant", formatted, {
            seed: accumulator.promptId,
            tag: "thinking",
          });
        });
      accumulator.pendingTranslations.push(pending);
    } else if (shouldDisplayThinking) {
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

    const assistantSegment = accumulator.currentAssistantChunks.join("");
    accumulator.currentAssistantChunks.length = 0;
    const pendingTranslations = [...accumulator.pendingTranslations];
    accumulator.pendingTranslations.length = 0;
    if (pendingTranslations.length === 0) {
      this.emitDialogMessage(session, "assistant", assistantSegment, {
        seed: accumulator.promptId,
      });
      accumulator.pendingDialogMessageFlush = Promise.resolve();
      return [];
    }

    accumulator.pendingDialogMessageFlush =
      accumulator.pendingDialogMessageFlush.then(async () => {
        if (pendingTranslations.length > 0) {
          await Promise.allSettled(pendingTranslations);
        }
        this.emitDialogMessage(session, "assistant", assistantSegment, {
          seed: accumulator.promptId,
        });
      });
    return [];
  }

  async drainPendingDialogMessages(
    accumulator: TurnAccumulator
  ): Promise<void> {
    await accumulator.pendingDialogMessageFlush;
    if (accumulator.pendingTranslations.length === 0) {
      return;
    }

    const pendingTranslations = [...accumulator.pendingTranslations];
    accumulator.pendingTranslations.length = 0;
    await Promise.allSettled(pendingTranslations);
    await accumulator.pendingDialogMessageFlush;
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

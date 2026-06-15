import crypto from "node:crypto";
import type { ThoughtSummary } from "@google/gemini-cli-core/dist/src/utils/thoughtUtils";
import type { UsageMetadata } from "@google/genai";
import type { ToolCallRequestInfo } from "../runtime/gemini-cli-compat";
import type { ActiveSession } from "../session/types";
import type { GeminiSessionEvent } from "../types";
import type { ThoughtTranslatorService } from "./thought-translator-service";

const INLINE_THOUGHT_MARKER_REGEX = /\[Thought:\s*(true|false)\]/;
const CYRILLIC_TARGET_LANGUAGES: ReadonlySet<string> = new Set([
  "ab",
  "be",
  "bg",
  "kk",
  "ky",
  "mk",
  "mn",
  "ru",
  "sr",
  "tg",
  "uk",
]);
const CYRILLIC_CHAR_REGEX = /[\u0400-\u052F]/;

const MISROUTED_THINKING_PREFIXES: readonly string[] = [
  "sthought",
  "CRITICAL INSTRUCTION",
  "Related tools:",
  "Plan:\n",
  "Drafting the content",
];

const hasMisroutedThinkingPrefix = (text: string): boolean => {
  const trimmed = text.trimStart();
  return MISROUTED_THINKING_PREFIXES.some((prefix) =>
    trimmed.startsWith(prefix)
  );
};

export interface TurnAccumulator {
  citations: string[];
  currentAssistantChunks: string[];
  pendingDialogMessageFlush: Promise<void>;
  pendingTranslations: Promise<void>[];
  preToolAssistantSegment: string | null;
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
      preToolAssistantSegment: null,
    };
  }

  snapshotPreToolAssistantSegment(accumulator: TurnAccumulator): void {
    if (accumulator.preToolAssistantSegment !== null) {
      return;
    }
    const snapshot = accumulator.currentAssistantChunks.join("");
    accumulator.preToolAssistantSegment = snapshot;
    accumulator.currentAssistantChunks.length = 0;
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
    _session: ActiveSession,
    value: unknown,
    accumulator: TurnAccumulator
  ): readonly GeminiSessionEvent[] {
    const chunk = typeof value === "string" ? value : "";
    if (chunk.length > 0) {
      accumulator.currentAssistantChunks.push(chunk);
      accumulator.responseChunks.push(chunk);
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

    const formatted =
      value.subject && value.subject.trim().length > 0
        ? `${value.subject.trim()}: ${value.description}`
        : value.description;

    if (this.thoughtTranslator) {
      const pending = this.thoughtTranslator
        .translateThought(
          value,
          session.runtimeTurnConfig.messagesForTheUserLanguage,
          session.runtimeTurnConfig.translationEngineId
        )
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
    accumulator.usage =
      value && typeof value === "object"
        ? (value as { usageMetadata?: UsageMetadata }).usageMetadata
        : undefined;

    const rawSegment = accumulator.currentAssistantChunks.join("");
    accumulator.currentAssistantChunks.length = 0;
    const preToolSnapshot = accumulator.preToolAssistantSegment;
    accumulator.preToolAssistantSegment = null;

    const { preMarker, postMarker, hasMarker } =
      this.splitInlineThoughtMarker(rawSegment);
    if (hasMarker && preMarker.trim().length > 0) {
      this.emitInlineThoughtAsThinking(session, preMarker, accumulator);
    }
    let assistantSegment = hasMarker ? postMarker : rawSegment;

    if (preToolSnapshot !== null && preToolSnapshot.trim().length > 0) {
      const targetLanguage =
        session.runtimeTurnConfig.messagesForTheUserLanguage;
      if (this.shouldReclassifyAsThinking(preToolSnapshot, targetLanguage)) {
        this.emitInlineThoughtAsThinking(session, preToolSnapshot, accumulator);
      } else {
        assistantSegment = preToolSnapshot + assistantSegment;
      }
    }

    if (
      assistantSegment.trim().length > 0 &&
      hasMisroutedThinkingPrefix(assistantSegment)
    ) {
      this.emitInlineThoughtAsThinking(session, assistantSegment, accumulator);
      assistantSegment = "";
    }

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

  private splitInlineThoughtMarker(text: string): {
    readonly preMarker: string;
    readonly postMarker: string;
    readonly hasMarker: boolean;
  } {
    const match = text.match(INLINE_THOUGHT_MARKER_REGEX);
    if (!match || match.index === undefined) {
      return { preMarker: text, postMarker: "", hasMarker: false };
    }
    const preMarker = text.slice(0, match.index);
    const postMarker = text.slice(match.index + match[0].length);
    return { preMarker, postMarker, hasMarker: true };
  }

  private emitInlineThoughtAsThinking(
    session: ActiveSession,
    text: string,
    accumulator: TurnAccumulator
  ): void {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return;
    }

    const synthetic = { description: trimmed, subject: "" };
    if (this.thoughtTranslator) {
      const pending = this.thoughtTranslator
        .translateThought(
          synthetic,
          session.runtimeTurnConfig.messagesForTheUserLanguage,
          session.runtimeTurnConfig.translationEngineId
        )
        .then((translated: string | null) => {
          this.emitDialogMessage(session, "assistant", translated ?? trimmed, {
            seed: accumulator.promptId,
            tag: "thinking",
          });
        })
        .catch(() => {
          this.emitDialogMessage(session, "assistant", trimmed, {
            seed: accumulator.promptId,
            tag: "thinking",
          });
        });
      accumulator.pendingTranslations.push(pending);
    } else {
      this.emitDialogMessage(session, "assistant", trimmed, {
        seed: accumulator.promptId,
        tag: "thinking",
      });
    }
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

  private shouldReclassifyAsThinking(
    text: string,
    targetLanguage?: string
  ): boolean {
    const normalized = targetLanguage?.trim().toLowerCase();
    if (!(normalized && CYRILLIC_TARGET_LANGUAGES.has(normalized))) {
      return false;
    }
    return !CYRILLIC_CHAR_REGEX.test(text);
  }
}

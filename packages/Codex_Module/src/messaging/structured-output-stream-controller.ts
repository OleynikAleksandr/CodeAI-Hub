import type { CodexTurnOptions } from "../types";
import { AnswerJsonStreamExtractor } from "./answer-json-stream-extractor";

const CODEX_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: {
      type: "string",
      description: "Final answer for the user. Markdown allowed.",
    },
    reasoning_summary_ru: {
      type: "string",
      description:
        "Brief Russian reasoning summary for the user. No chain-of-thought, code, or formulas. Empty string allowed.",
    },
  },
  required: ["answer", "reasoning_summary_ru"],
} as const;

type ParsedOutput = {
  readonly answer?: string;
  readonly reasoningSummary?: string;
};

type AnswerStreamState = {
  extractor: AnswerJsonStreamExtractor;
  itemId: string | null;
  answerText: string;
};

export type StructuredOutputResult = {
  readonly streamDelta?: string;
  readonly assistantText?: string;
  readonly reasoningSummary?: string;
};

export class StructuredOutputStreamController {
  private readonly streams = new Map<string, AnswerStreamState>();

  applyOutputSchema(turnOptions: CodexTurnOptions): CodexTurnOptions {
    if (turnOptions.outputSchema) {
      return turnOptions;
    }
    return { ...turnOptions, outputSchema: CODEX_OUTPUT_SCHEMA };
  }

  startTurn(sessionId: string): void {
    this.streams.set(sessionId, {
      extractor: new AnswerJsonStreamExtractor(),
      itemId: null,
      answerText: "",
    });
  }

  appendChunk(sessionId: string, itemId: string, text: string): string | null {
    const state = this.ensureState(sessionId, itemId);
    const delta = state.extractor.append(text);
    if (delta) {
      state.answerText += delta;
    }
    return delta ?? null;
  }

  complete(
    sessionId: string,
    itemId: string,
    text: string
  ): StructuredOutputResult {
    const state = this.ensureState(sessionId, itemId);
    const streamDelta = state.extractor.append(text) ?? null;
    if (streamDelta) {
      state.answerText += streamDelta;
    }
    const parsed = parseStructuredOutput(text);
    const assistantText =
      state.answerText.trim().length > 0 ? state.answerText : parsed.answer;
    this.streams.delete(sessionId);
    return {
      streamDelta: streamDelta ?? undefined,
      assistantText: assistantText ?? undefined,
      reasoningSummary: parsed.reasoningSummary ?? undefined,
    };
  }

  clear(sessionId: string): void {
    this.streams.delete(sessionId);
  }

  private ensureState(sessionId: string, itemId: string): AnswerStreamState {
    const existing = this.streams.get(sessionId);
    if (!existing || (existing.itemId && existing.itemId !== itemId)) {
      const fresh = {
        extractor: new AnswerJsonStreamExtractor(),
        itemId,
        answerText: "",
      };
      this.streams.set(sessionId, fresh);
      return fresh;
    }
    if (!existing.itemId) {
      existing.itemId = itemId;
    }
    return existing;
  }
}

const parseStructuredOutput = (text: string): ParsedOutput => {
  if (!text) {
    return {};
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const answer =
      typeof parsed.answer === "string" ? parsed.answer : undefined;
    const reasoningSummary =
      typeof parsed.reasoning_summary_ru === "string"
        ? parsed.reasoning_summary_ru
        : undefined;
    return {
      answer,
      reasoningSummary: reasoningSummary?.trim().length
        ? reasoningSummary
        : undefined,
    };
  } catch {
    return {};
  }
};

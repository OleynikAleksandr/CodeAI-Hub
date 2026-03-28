import { createHash } from "node:crypto";
import type { CodexResponsePolicy } from "../response-policy/response-policy-types";
import type { CodexTurnOptions } from "../types";
import {
  parseStructuredOutput,
  type StructuredOutputResult,
  type StructuredOutputTurnConfig,
} from "./structured-output-parser";
import { StructuredOutputStateStore } from "./structured-output-state";

export type { StructuredOutputResult } from "./structured-output-parser";

export class StructuredOutputStreamController {
  private readonly state = new StructuredOutputStateStore();

  prepareTurn(
    sessionId: string,
    turnOptions: CodexTurnOptions,
    responsePolicy: CodexResponsePolicy
  ): StructuredOutputTurnConfig {
    return this.state.prepareTurn(sessionId, turnOptions, responsePolicy);
  }

  applyPrompt(prompt: string, config: StructuredOutputTurnConfig): string {
    return this.state.applyPrompt(prompt, config);
  }

  applyOutputSchema(
    turnOptions: CodexTurnOptions,
    config: StructuredOutputTurnConfig
  ): CodexTurnOptions {
    return this.state.applyOutputSchema(turnOptions, config);
  }

  shouldSuppressCommentary(sessionId: string): boolean {
    return this.state.shouldSuppressCommentary(sessionId);
  }

  startTurn(sessionId: string): void {
    this.state.startTurn(sessionId);
  }

  appendChunk(sessionId: string, itemId: string, text: string): string | null {
    const state = this.state.ensureState(sessionId, itemId);
    if (state.mode === "passthrough") {
      const delta = resolvePassthroughDelta(state.sourceText, text);
      state.sourceText = text;
      state.assistantText = text;
      return delta;
    }
    const delta = state.extractor?.append(text) ?? null;
    if (delta) {
      state.assistantText += delta;
    }
    return delta;
  }

  complete(
    sessionId: string,
    itemId: string,
    text: string
  ): StructuredOutputResult {
    const state = this.state.ensureState(sessionId, itemId);
    const result =
      state.mode === "passthrough"
        ? this.completePassthroughTurn(state, text)
        : this.completeStructuredTurn(sessionId, state, text);
    this.state.completeTurn(sessionId);
    return result;
  }

  clear(sessionId: string): void {
    this.state.clear(sessionId);
  }

  promoteSession(oldSessionId: string, newSessionId: string): void {
    this.state.promoteSession(oldSessionId, newSessionId);
  }

  private completePassthroughTurn(
    state: { readonly assistantText: string; readonly sourceText: string },
    text: string
  ): StructuredOutputResult {
    const streamDelta = resolvePassthroughDelta(state.sourceText, text);
    const assistantText = text.trim().length > 0 ? text : state.assistantText;
    return {
      streamDelta: streamDelta ?? undefined,
      assistantText:
        assistantText.trim().length > 0 ? assistantText : undefined,
      outputHash: buildOutputHash(text),
    };
  }

  private completeStructuredTurn(
    sessionId: string,
    state: {
      assistantText: string;
      extractor?: { append: (text: string) => string | null };
      mode: "default" | "idea_collector" | "passthrough";
    },
    text: string
  ): StructuredOutputResult {
    const streamDelta = state.extractor?.append(text) ?? null;
    if (streamDelta) {
      state.assistantText += streamDelta;
    }
    const parsed = parseStructuredOutput(text, state.mode, {
      allowedArtifactSlots:
        this.state.getTurnConfig(sessionId).allowedArtifactSlots,
    });
    let assistantText =
      state.assistantText.trim().length > 0
        ? state.assistantText
        : parsed.assistantText;
    if (state.mode === "idea_collector" && parsed.assistantText?.trim()) {
      assistantText = parsed.assistantText;
    }
    return {
      streamDelta: streamDelta ?? undefined,
      assistantText: assistantText ?? undefined,
      nextAction: parsed.nextAction ?? undefined,
      artifact: parsed.artifact ?? undefined,
      artifacts: parsed.artifacts ?? undefined,
      outputHash: buildOutputHash(text),
    };
  }
}

const resolvePassthroughDelta = (
  previousText: string,
  nextText: string
): string | null => {
  if (!nextText) {
    return null;
  }
  if (!previousText) {
    return nextText;
  }
  if (!nextText.startsWith(previousText)) {
    return nextText;
  }
  const delta = nextText.slice(previousText.length);
  return delta.length > 0 ? delta : null;
};

const buildOutputHash = (text: string): string | undefined => {
  const trimmedText = text.trim();
  return trimmedText.length > 0
    ? createHash("sha256").update(trimmedText).digest("hex")
    : undefined;
};

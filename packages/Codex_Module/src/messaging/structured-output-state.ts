import type { CodexResponsePolicy } from "../response-policy/response-policy-types";
import type { CodexTurnOptions } from "../types";
import { AnswerJsonStreamExtractor } from "./answer-json-stream-extractor";
import {
  applyStructuredOutputPrompt,
  applyStructuredOutputSchema,
  getDefaultStructuredOutputTurnConfig,
  resolveTurnConfig,
  type StructuredOutputMode,
  type StructuredOutputTurnConfig,
} from "./structured-output-parser";

interface AnswerStreamState {
  assistantText: string;
  extractor?: AnswerJsonStreamExtractor;
  itemId: string | null;
  mode: StructuredOutputMode;
  sourceText: string;
}

export class StructuredOutputStateStore {
  private readonly streams = new Map<string, AnswerStreamState>();
  private readonly turnConfigs = new Map<string, StructuredOutputTurnConfig>();

  prepareTurn(
    sessionId: string,
    turnOptions: CodexTurnOptions,
    responsePolicy: CodexResponsePolicy
  ): StructuredOutputTurnConfig {
    const config = resolveTurnConfig(turnOptions, responsePolicy);
    this.turnConfigs.set(sessionId, config);
    return config;
  }

  applyPrompt(prompt: string, config: StructuredOutputTurnConfig): string {
    return applyStructuredOutputPrompt(prompt, config);
  }

  applyOutputSchema(
    turnOptions: CodexTurnOptions,
    config: StructuredOutputTurnConfig
  ): CodexTurnOptions {
    return applyStructuredOutputSchema(turnOptions, config);
  }

  shouldSuppressCommentary(sessionId: string): boolean {
    return (
      this.turnConfigs.get(sessionId) ?? getDefaultStructuredOutputTurnConfig()
    ).suppressCommentary;
  }

  startTurn(sessionId: string): void {
    const config =
      this.turnConfigs.get(sessionId) ?? getDefaultStructuredOutputTurnConfig();
    this.streams.set(sessionId, {
      extractor:
        config.mode === "passthrough"
          ? undefined
          : new AnswerJsonStreamExtractor(config.fieldKey),
      itemId: null,
      assistantText: "",
      sourceText: "",
      mode: config.mode,
    });
  }

  ensureState(sessionId: string, itemId: string): AnswerStreamState {
    const existing = this.streams.get(sessionId);
    const config =
      this.turnConfigs.get(sessionId) ?? getDefaultStructuredOutputTurnConfig();
    if (!existing || (existing.itemId && existing.itemId !== itemId)) {
      const fresh: AnswerStreamState = {
        extractor:
          config.mode === "passthrough"
            ? undefined
            : new AnswerJsonStreamExtractor(config.fieldKey),
        itemId,
        assistantText: "",
        sourceText: "",
        mode: config.mode,
      };
      this.streams.set(sessionId, fresh);
      return fresh;
    }
    if (!existing.itemId) {
      existing.itemId = itemId;
    }
    return existing;
  }

  getTurnConfig(sessionId: string): StructuredOutputTurnConfig {
    return (
      this.turnConfigs.get(sessionId) ?? getDefaultStructuredOutputTurnConfig()
    );
  }

  clear(sessionId: string): void {
    this.streams.delete(sessionId);
    this.turnConfigs.delete(sessionId);
  }

  promoteSession(oldSessionId: string, newSessionId: string): void {
    if (oldSessionId === newSessionId) {
      return;
    }

    const config = this.turnConfigs.get(oldSessionId);
    if (config) {
      this.turnConfigs.set(newSessionId, config);
      this.turnConfigs.delete(oldSessionId);
    }

    const state = this.streams.get(oldSessionId);
    if (state) {
      this.streams.set(newSessionId, state);
      this.streams.delete(oldSessionId);
    }
  }

  completeTurn(sessionId: string): void {
    this.streams.delete(sessionId);
  }
}

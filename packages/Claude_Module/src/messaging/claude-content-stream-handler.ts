import type { ActiveSession } from "../session/types";
import type { ClaudeStreamMessage } from "../types";
import { ClaudeTextLiveBuffer } from "./claude-text-live-buffer";
import {
  emitClaudeAssistantLiveText,
  emitClaudeThinkingDialog,
} from "./claude-thinking-dialog-emitter";
import { ClaudeThinkingLiveBuffer } from "./claude-thinking-live-buffer";

type ActiveBlockKind = "thinking" | "text" | "other";

const CYRILLIC_LANGUAGE_CODES = new Set([
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
const CYRILLIC_CHAR_REGEX = /[\u0400-\u052F]/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const shouldHoldLocalizedPreToolText = (
  targetLanguage: string | undefined,
  text: string
): boolean => {
  const normalizedLanguage = targetLanguage?.trim().toLowerCase();
  if (
    !(normalizedLanguage && CYRILLIC_LANGUAGE_CODES.has(normalizedLanguage))
  ) {
    return false;
  }
  return !CYRILLIC_CHAR_REGEX.test(text);
};

/**
 * Owns the live content ingestion path for the Claude provider:
 * - watches `content_block_start` for thinking and text blocks to reset prior
 *   buffer state and record the active block kind,
 * - feeds `content_block_delta` fragments (`thinking_delta`, `text_delta`)
 *   into per-session buffers and emits readable segments as append-only
 *   dialog messages (thinking) or live assistant bubbles (text),
 * - flushes the remaining tail on `content_block_stop` for the active block,
 * - exposes buffers for finalization dedupe against the assembled message.
 *
 * Each handler returns true when it has fully consumed the message so the
 * router can short-circuit the rest of its stream-event handling.
 */
export class ClaudeContentStreamHandler {
  readonly thinkingBuffer: ClaudeThinkingLiveBuffer;
  readonly textBuffer: ClaudeTextLiveBuffer;
  private readonly activeBlockKindBySession = new Map<
    string,
    ActiveBlockKind
  >();
  private readonly suppressedTextBySession = new Map<string, string>();

  constructor(
    thinkingBuffer?: ClaudeThinkingLiveBuffer,
    textBuffer?: ClaudeTextLiveBuffer
  ) {
    this.thinkingBuffer = thinkingBuffer ?? new ClaudeThinkingLiveBuffer();
    this.textBuffer = textBuffer ?? new ClaudeTextLiveBuffer();
  }

  handleBlockStart(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): boolean {
    if (!this.isStreamEvent(message, "content_block_start")) {
      return false;
    }
    const event = message.event as Record<string, unknown>;
    const block = isRecord(event.content_block) ? event.content_block : null;
    const kind = block?.type;
    if (kind === "thinking") {
      this.thinkingBuffer.reset(session.sessionId);
      this.activeBlockKindBySession.set(session.sessionId, "thinking");
      return true;
    }
    if (kind === "text") {
      this.textBuffer.reset(session.sessionId);
      this.suppressedTextBySession.delete(session.sessionId);
      this.activeBlockKindBySession.set(session.sessionId, "text");
      return true;
    }
    this.activeBlockKindBySession.set(session.sessionId, "other");
    return false;
  }

  handleDelta(session: ActiveSession, message: ClaudeStreamMessage): boolean {
    if (!this.isStreamEvent(message, "content_block_delta")) {
      return false;
    }
    const event = message.event as Record<string, unknown>;
    const delta = isRecord(event.delta) ? event.delta : null;
    return (
      this.handleThinkingDelta(session, message, delta) ||
      this.handleTextDelta(session, message, delta)
    );
  }

  handleBlockStop(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): boolean {
    if (!this.isStreamEvent(message, "content_block_stop")) {
      return false;
    }
    const kind = this.activeBlockKindBySession.get(session.sessionId);
    this.activeBlockKindBySession.delete(session.sessionId);
    if (
      kind === "thinking" &&
      this.thinkingBuffer.hasAccumulatedContent(session.sessionId)
    ) {
      const remaining = this.thinkingBuffer.flushRemaining(session.sessionId);
      if (remaining) {
        emitClaudeThinkingDialog(
          session,
          message,
          remaining,
          "thinking_live_tail"
        );
      }
      return true;
    }
    if (
      kind === "text" &&
      this.suppressedTextBySession.has(session.sessionId)
    ) {
      return true;
    }
    if (
      kind === "text" &&
      this.textBuffer.hasAccumulatedContent(session.sessionId)
    ) {
      const remaining = this.textBuffer.flushRemaining(session.sessionId);
      if (remaining) {
        emitClaudeAssistantLiveText(
          session,
          message,
          remaining,
          "text_live_tail"
        );
      }
      return true;
    }
    return false;
  }

  resetSession(sessionKey: string): void {
    this.thinkingBuffer.reset(sessionKey);
    this.textBuffer.reset(sessionKey);
    this.suppressedTextBySession.delete(sessionKey);
    this.activeBlockKindBySession.delete(sessionKey);
  }

  /**
   * Reconcile an incoming final assembled thinking block with what was
   * already materialized via the delta path. Returns the unseen tail that
   * still needs to be emitted, `null` if the final block is fully covered
   * by live chunks, or the full text if the delta path never ran.
   */
  consumeFinalThinking(sessionKey: string, finalText: string): string | null {
    return this.thinkingBuffer.consumeFinal(sessionKey, finalText);
  }

  /**
   * Reconcile an incoming final assembled assistant text block with what was
   * already materialized via the delta path. Same three-case contract as
   * consumeFinalThinking: superset → tail, divergent → full text, no live →
   * full text (legacy behavior).
   */
  consumeFinalText(sessionKey: string, finalText: string): string | null {
    return this.textBuffer.consumeFinal(sessionKey, finalText);
  }

  /**
   * Check whether live text has already been materialized for this session.
   * Used by the router to decide whether a later pending-assistant-text flush
   * should skip re-emitting the same content.
   */
  hasMaterializedText(sessionKey: string): boolean {
    return this.textBuffer.hasMaterializedContent(sessionKey);
  }

  consumeSuppressedText(sessionKey: string): string | null {
    const suppressed = this.suppressedTextBySession.get(sessionKey);
    this.suppressedTextBySession.delete(sessionKey);
    return suppressed && suppressed.trim().length > 0 ? suppressed : null;
  }

  private isStreamEvent(
    message: ClaudeStreamMessage,
    eventType: string
  ): boolean {
    if (message.type !== "stream_event" || !isRecord(message.event)) {
      return false;
    }
    return message.event.type === eventType;
  }

  private handleThinkingDelta(
    session: ActiveSession,
    message: ClaudeStreamMessage,
    delta: Record<string, unknown> | null
  ): boolean {
    if (delta?.type !== "thinking_delta") {
      return false;
    }
    const text = typeof delta.thinking === "string" ? delta.thinking : null;
    if (!text) {
      return true;
    }
    const segment = this.thinkingBuffer.appendDelta(session.sessionId, text);
    if (segment) {
      emitClaudeThinkingDialog(session, message, segment, "thinking_live");
    }
    return true;
  }

  private handleTextDelta(
    session: ActiveSession,
    message: ClaudeStreamMessage,
    delta: Record<string, unknown> | null
  ): boolean {
    if (delta?.type !== "text_delta") {
      return false;
    }
    const text = typeof delta.text === "string" ? delta.text : null;
    if (!text) {
      return true;
    }
    const sessionKey = session.sessionId;
    const suppressed = this.suppressedTextBySession.get(sessionKey);
    if (suppressed !== undefined) {
      return this.handleSuppressedTextDelta(
        session,
        message,
        sessionKey,
        suppressed,
        text
      );
    }
    if (this.shouldSuppressTextDelta(session, text)) {
      this.suppressedTextBySession.set(sessionKey, text);
      return true;
    }
    this.emitLiveTextSegment(session, message, sessionKey, text);
    return true;
  }

  private handleSuppressedTextDelta(
    session: ActiveSession,
    message: ClaudeStreamMessage,
    sessionKey: string,
    suppressed: string,
    text: string
  ): boolean {
    const combined = `${suppressed}${text}`;
    if (this.shouldSuppressTextDelta(session, combined)) {
      this.suppressedTextBySession.set(sessionKey, combined);
      return true;
    }
    this.suppressedTextBySession.delete(sessionKey);
    this.emitLiveTextSegment(session, message, sessionKey, combined);
    return true;
  }

  private shouldSuppressTextDelta(
    session: ActiveSession,
    text: string
  ): boolean {
    return shouldHoldLocalizedPreToolText(
      session.runtimeTurnConfig.messagesForTheUserLanguage,
      text
    );
  }

  private emitLiveTextSegment(
    session: ActiveSession,
    message: ClaudeStreamMessage,
    sessionKey: string,
    text: string
  ): void {
    const segment = this.textBuffer.appendDelta(sessionKey, text);
    if (segment) {
      emitClaudeAssistantLiveText(session, message, segment, "text_live");
    }
  }
}

import type { ActiveSession } from "../session/types";
import type { ClaudeStreamMessage } from "../types";
import { emitClaudeThinkingDialog } from "./claude-thinking-dialog-emitter";
import { ClaudeThinkingLiveBuffer } from "./claude-thinking-live-buffer";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Owns the live-thinking ingestion path for the Claude provider:
 * - watches for `content_block_start` thinking blocks to reset prior state,
 * - feeds `content_block_delta` thinking_delta fragments into the per-session
 *   `ClaudeThinkingLiveBuffer`,
 * - flushes the remaining tail on `content_block_stop`,
 * - exposes the underlying buffer for finalization dedupe.
 *
 * Each handler returns true when it has fully consumed the message so the
 * router can short-circuit further processing.
 */
export class ClaudeThinkingStreamHandler {
  readonly buffer: ClaudeThinkingLiveBuffer;

  constructor(buffer?: ClaudeThinkingLiveBuffer) {
    this.buffer = buffer ?? new ClaudeThinkingLiveBuffer();
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
    if (!block || block.type !== "thinking") {
      return false;
    }
    this.buffer.reset(session.sessionId);
    return true;
  }

  handleDelta(session: ActiveSession, message: ClaudeStreamMessage): boolean {
    if (!this.isStreamEvent(message, "content_block_delta")) {
      return false;
    }
    const event = message.event as Record<string, unknown>;
    const delta = isRecord(event.delta) ? event.delta : null;
    if (!delta || delta.type !== "thinking_delta") {
      return false;
    }
    const text = typeof delta.thinking === "string" ? delta.thinking : null;
    if (!text) {
      return true;
    }
    const segment = this.buffer.appendDelta(session.sessionId, text);
    if (segment) {
      emitClaudeThinkingDialog(session, message, segment, "thinking_live");
    }
    return true;
  }

  handleBlockStop(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): boolean {
    if (!this.isStreamEvent(message, "content_block_stop")) {
      return false;
    }
    if (!this.buffer.hasAccumulatedContent(session.sessionId)) {
      return false;
    }
    const remaining = this.buffer.flushRemaining(session.sessionId);
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

  resetSession(sessionKey: string): void {
    this.buffer.reset(sessionKey);
  }

  /**
   * Reconcile an incoming final assembled thinking block with what was
   * already materialized via the delta path. Returns the unseen tail that
   * still needs to be emitted, `null` if the final block is fully covered
   * by live chunks, or the full text if the delta path never ran.
   */
  consumeFinalThinking(sessionKey: string, finalText: string): string | null {
    return this.buffer.consumeFinal(sessionKey, finalText);
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
}

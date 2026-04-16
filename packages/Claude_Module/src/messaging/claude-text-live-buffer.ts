/**
 * Per-session live-text buffer for Claude provider.
 *
 * The router feeds raw `text_delta` fragments into this buffer as they arrive
 * over the SSE stream. The buffer accumulates the native text and extracts
 * readable segments at sentence/paragraph boundaries so the UI can show
 * assistant replies incrementally instead of waiting for the final assembled
 * text block. Works identically for pre-tool assistant text (where large
 * tool_use input_json_delta payloads would otherwise hold visible text in a
 * pending buffer for minutes) and for final end_turn text.
 *
 * Finalization dedupe is owned by `consumeFinal()` and used by the router
 * after the assembled `assistant` message arrives to suppress duplicate
 * emission of text already materialized via delta fragments.
 */

const MIN_FLUSH_CHARS = 96;
const SENTENCE_BOUNDARY_REGEX = /[.!?…\n]/g;

interface LiveTextState {
  materializedLength: number;
  nativeAccumulated: string;
}

export class ClaudeTextLiveBuffer {
  private readonly stateBySession = new Map<string, LiveTextState>();

  /**
   * Append a text_delta fragment for the given session and return a readable
   * segment that should be emitted now, or null if the buffer is not ready
   * to flush yet.
   */
  appendDelta(sessionKey: string, deltaText: string): string | null {
    if (deltaText.length === 0) {
      return null;
    }
    let state = this.stateBySession.get(sessionKey);
    if (!state) {
      state = { materializedLength: 0, nativeAccumulated: "" };
      this.stateBySession.set(sessionKey, state);
    }
    state.nativeAccumulated += deltaText;
    return this.tryExtractFlushSegment(state);
  }

  /**
   * Force-emit any remaining accumulated text as a readable segment.
   * Called on `content_block_stop` for the text block so the tail does
   * not stay invisible until the final assembled message arrives.
   */
  flushRemaining(sessionKey: string): string | null {
    const state = this.stateBySession.get(sessionKey);
    if (!state) {
      return null;
    }
    const remaining = state.nativeAccumulated.slice(state.materializedLength);
    if (remaining.trim().length === 0) {
      return null;
    }
    state.materializedLength = state.nativeAccumulated.length;
    return remaining;
  }

  /**
   * Compare the final assembled text block against what was materialized
   * via deltas. Returns the unseen tail (or full text if no delta path was
   * used). Buffer state for the session is cleared after this call.
   */
  consumeFinal(sessionKey: string, finalText: string): string | null {
    const state = this.stateBySession.get(sessionKey);
    if (!state || state.materializedLength === 0) {
      this.stateBySession.delete(sessionKey);
      return finalText.trim().length > 0 ? finalText : null;
    }
    const materialized = state.nativeAccumulated.slice(
      0,
      state.materializedLength
    );
    this.stateBySession.delete(sessionKey);
    if (finalText.startsWith(materialized)) {
      const tail = finalText.slice(state.materializedLength);
      return tail.trim().length > 0 ? tail : null;
    }
    return finalText;
  }

  /**
   * Drop session state without emitting anything. Used on a new text block
   * start, on shutdown, and on terminal events that did not produce a final
   * assembled text block.
   */
  reset(sessionKey: string): void {
    this.stateBySession.delete(sessionKey);
  }

  /**
   * Drop all buffered state across every session.
   */
  clear(): void {
    this.stateBySession.clear();
  }

  hasMaterializedContent(sessionKey: string): boolean {
    const state = this.stateBySession.get(sessionKey);
    return state !== undefined && state.materializedLength > 0;
  }

  hasAccumulatedContent(sessionKey: string): boolean {
    const state = this.stateBySession.get(sessionKey);
    return state !== undefined && state.nativeAccumulated.length > 0;
  }

  private tryExtractFlushSegment(state: LiveTextState): string | null {
    const tail = state.nativeAccumulated.slice(state.materializedLength);
    if (tail.length < MIN_FLUSH_CHARS) {
      return null;
    }
    let lastBoundary = -1;
    SENTENCE_BOUNDARY_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null = SENTENCE_BOUNDARY_REGEX.exec(tail);
    while (match !== null) {
      lastBoundary = match.index + match[0].length;
      match = SENTENCE_BOUNDARY_REGEX.exec(tail);
    }
    if (lastBoundary <= 0) {
      return null;
    }
    const segment = tail.slice(0, lastBoundary);
    state.materializedLength += lastBoundary;
    return segment;
  }
}

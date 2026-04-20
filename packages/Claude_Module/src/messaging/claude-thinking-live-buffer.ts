/**
 * Per-session live-thinking buffer for Claude provider.
 *
 * The router feeds raw `thinking_delta` text fragments into this buffer as
 * they arrive over the SSE stream. The buffer accumulates the native text and
 * extracts readable segments at sentence/paragraph boundaries so the UI can
 * show reasoning incrementally instead of waiting for the final assembled
 * `thinking` block.
 *
 * Finalization dedupe (comparing the final assembled block against what was
 * already materialized) is owned by `consumeFinal()` and used by the router
 * after the final assistant message arrives to suppress duplicate emission.
 */

const MIN_FLUSH_CHARS = 240;
const SENTENCE_BOUNDARY_REGEX = /[.!?…\n]/g;
const TRAILING_MARKDOWN_LIST_MARKER_REGEX =
  /(?:^|\n)\s{0,3}(?:\d+\.|[-*+])\s*$/u;

interface LiveThinkingState {
  materializedLength: number;
  nativeAccumulated: string;
}

export class ClaudeThinkingLiveBuffer {
  private readonly stateBySession = new Map<string, LiveThinkingState>();

  /**
   * Append a thinking_delta fragment for the given session and return a
   * readable segment that should be emitted now, or null if the buffer is
   * not ready to flush yet.
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
   * Called on `content_block_stop` for the thinking block so the tail does
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
   * Compare the final assembled thinking block against what was materialized
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
   * Drop session state without emitting anything. Used on a new thinking
   * block start, on shutdown, and on terminal events that did not produce a
   * final assembled thinking block.
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

  private tryExtractFlushSegment(state: LiveThinkingState): string | null {
    const tail = state.nativeAccumulated.slice(state.materializedLength);
    if (tail.length < MIN_FLUSH_CHARS) {
      return null;
    }
    let lastSafeBoundary = -1;
    SENTENCE_BOUNDARY_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null = SENTENCE_BOUNDARY_REGEX.exec(tail);
    while (match !== null) {
      const boundary = match.index + match[0].length;
      const candidate = tail.slice(0, boundary);
      if (!this.endsWithMarkerOnlyListLine(candidate)) {
        lastSafeBoundary = boundary;
      }
      match = SENTENCE_BOUNDARY_REGEX.exec(tail);
    }
    if (lastSafeBoundary <= 0) {
      return null;
    }
    const segment = tail.slice(0, lastSafeBoundary);
    state.materializedLength += lastSafeBoundary;
    return segment;
  }

  private endsWithMarkerOnlyListLine(text: string): boolean {
    const normalized = text.trimEnd();
    if (normalized.length === 0) {
      return false;
    }
    return TRAILING_MARKDOWN_LIST_MARKER_REGEX.test(normalized);
  }
}

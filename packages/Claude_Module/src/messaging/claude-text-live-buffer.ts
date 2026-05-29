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
const MIN_FINAL_OVERLAP_CHARS = 32;
const MAX_FINAL_OVERLAP_SCAN_CHARS = 12_000;
const ORPHAN_FINAL_TAIL_MAX_CHARS = 24;
const SENTENCE_BOUNDARY_REGEX = /[.!?…\n]/g;
const TRAILING_MARKDOWN_LIST_MARKER_REGEX =
  /(?:^|\n)\s{0,3}(?:\d+\.|[-*+])\s*$/u;
const LEADING_WHITESPACE_REGEX = /^\s/u;
const URL_LIKE_TOKEN_REGEX = /(?:^|[([])(?:https?:\/\/|www\.)/iu;
const URL_CONTINUATION_CHAR_REGEX = /[\p{L}\p{N}_~:/?#[\]@!$&'()*+,;=%-]/u;
const WORD_OR_FILENAME_TAIL_REGEX = /^[\p{L}\p{N}_-]/u;

interface LiveTextState {
  finalizedText: string | null;
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
      state = {
        finalizedText: null,
        materializedLength: 0,
        nativeAccumulated: "",
      };
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
    if (state.finalizedText !== null) {
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
   * used). Keeps canonical finalized ownership so a late `content_block_stop`
   * cannot emit a second tail for the same text block.
   */
  consumeFinal(sessionKey: string, finalText: string): string | null {
    const state = this.stateBySession.get(sessionKey);
    if (!state) {
      return finalText.trim().length > 0 ? finalText : null;
    }
    state.finalizedText = finalText;
    if (state.materializedLength === 0) {
      return finalText.trim().length > 0 ? finalText : null;
    }
    const materialized = state.nativeAccumulated.slice(
      0,
      state.materializedLength
    );
    if (!finalText.startsWith(materialized)) {
      const overlapTail = this.resolveCoveredOrOverlappingFinalText(
        materialized,
        finalText
      );
      return overlapTail === undefined ? finalText : overlapTail;
    }
    return this.normalizeFinalTail(finalText.slice(state.materializedLength));
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
    let lastSafeBoundary = -1;
    SENTENCE_BOUNDARY_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null = SENTENCE_BOUNDARY_REGEX.exec(tail);
    while (match !== null) {
      const boundary = match.index + match[0].length;
      const candidate = tail.slice(0, boundary);
      if (
        !(
          this.endsWithMarkerOnlyListLine(candidate) ||
          this.endsInsideInlineCode(tail, match.index) ||
          this.endsInsideUrlLikeToken(tail, match.index)
        )
      ) {
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

  private endsInsideInlineCode(text: string, boundaryStart: number): boolean {
    if (text[boundaryStart] !== ".") {
      return false;
    }
    const beforeBoundary = text.slice(0, boundaryStart);
    const backtickCount = [...beforeBoundary].filter(
      (char) => char === "`"
    ).length;
    return backtickCount % 2 === 1;
  }

  private endsInsideUrlLikeToken(text: string, boundaryStart: number): boolean {
    if (text[boundaryStart] !== ".") {
      return false;
    }
    const beforeBoundary = text.slice(0, boundaryStart);
    const tokenStart = Math.max(
      beforeBoundary.lastIndexOf(" "),
      beforeBoundary.lastIndexOf("\n"),
      beforeBoundary.lastIndexOf("\t")
    );
    const token = beforeBoundary.slice(tokenStart + 1);
    if (!URL_LIKE_TOKEN_REGEX.test(token)) {
      return false;
    }
    const nextChar = text[boundaryStart + 1];
    return nextChar === undefined || URL_CONTINUATION_CHAR_REGEX.test(nextChar);
  }

  private resolveCoveredOrOverlappingFinalText(
    materialized: string,
    finalText: string
  ): string | null | undefined {
    if (
      finalText.trim().length >= MIN_FINAL_OVERLAP_CHARS &&
      materialized.includes(finalText)
    ) {
      return null;
    }
    const overlapLength = this.longestSuffixPrefixOverlap(
      materialized,
      finalText
    );
    if (overlapLength < MIN_FINAL_OVERLAP_CHARS) {
      return undefined;
    }
    return this.normalizeFinalTail(finalText.slice(overlapLength));
  }

  private longestSuffixPrefixOverlap(left: string, right: string): number {
    const leftWindow = left.slice(-MAX_FINAL_OVERLAP_SCAN_CHARS);
    const rightWindow = right.slice(0, MAX_FINAL_OVERLAP_SCAN_CHARS);
    const maxLength = Math.min(leftWindow.length, rightWindow.length);
    for (
      let length = maxLength;
      length >= MIN_FINAL_OVERLAP_CHARS;
      length -= 1
    ) {
      if (leftWindow.endsWith(rightWindow.slice(0, length))) {
        return length;
      }
    }
    return 0;
  }

  private normalizeFinalTail(tail: string): string | null {
    return tail.trim().length > 0 && !this.isLikelyOrphanFinalTail(tail)
      ? tail
      : null;
  }

  private isLikelyOrphanFinalTail(tail: string): boolean {
    const trimmed = tail.trim();
    return (
      trimmed.length > 0 &&
      trimmed.length <= ORPHAN_FINAL_TAIL_MAX_CHARS &&
      !LEADING_WHITESPACE_REGEX.test(tail) &&
      WORD_OR_FILENAME_TAIL_REGEX.test(trimmed)
    );
  }
}

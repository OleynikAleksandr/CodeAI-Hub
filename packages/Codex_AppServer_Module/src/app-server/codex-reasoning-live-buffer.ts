/**
 * Per-item readable live buffer for Codex app-server reasoning.
 *
 * The app-server may stream reasoning as either summary deltas or raw
 * reasoning text deltas. The UI expects append-only readable segments, not
 * individual token fragments. This buffer accumulates the chosen source for
 * one reasoning item, extracts boundary-aligned segments once the tail grows
 * large enough, and reconciles the final assembled reasoning block against
 * what was already materialized live.
 */

const MIN_FLUSH_CHARS = 240;
const SENTENCE_BOUNDARY_REGEX = /[.!?…\n]/g;

type ReasoningDeltaSource = "summary" | "text";

interface ReasoningLiveState {
  materializedLength: number;
  nativeAccumulated: string;
  source: ReasoningDeltaSource | null;
  summaryParts: string[];
}

export class CodexReasoningLiveBuffer {
  private readonly stateByItem = new Map<string, ReasoningLiveState>();

  ensureSummaryPart(itemKey: string, summaryIndex: number): void {
    const state = this.ensureState(itemKey);
    while (state.summaryParts.length <= summaryIndex) {
      state.summaryParts.push("");
    }
  }

  appendSummaryDelta(
    itemKey: string,
    summaryIndex: number,
    deltaText: string
  ): string | null {
    if (deltaText.length === 0) {
      return null;
    }
    const state = this.ensureState(itemKey);
    if (state.source === "text") {
      return null;
    }
    state.source = "summary";
    while (state.summaryParts.length <= summaryIndex) {
      state.summaryParts.push("");
    }
    state.summaryParts[summaryIndex] =
      `${state.summaryParts[summaryIndex] ?? ""}${deltaText}`;
    state.nativeAccumulated = state.summaryParts.join("");
    return this.tryExtractFlushSegment(state);
  }

  appendTextDelta(itemKey: string, deltaText: string): string | null {
    if (deltaText.length === 0) {
      return null;
    }
    const state = this.ensureState(itemKey);
    if (state.source === "summary") {
      return null;
    }
    state.source = "text";
    state.nativeAccumulated += deltaText;
    return this.tryExtractFlushSegment(state);
  }

  consumeFinal(itemKey: string, finalText: string): string | null {
    const state = this.stateByItem.get(itemKey);
    if (!state) {
      return finalText.trim().length > 0 ? finalText : null;
    }
    this.stateByItem.delete(itemKey);
    const canonicalFinal =
      finalText.trim().length > 0 ? finalText : state.nativeAccumulated;
    if (canonicalFinal.trim().length === 0) {
      return null;
    }
    if (state.materializedLength === 0) {
      return canonicalFinal;
    }
    const materialized = state.nativeAccumulated.slice(
      0,
      state.materializedLength
    );
    if (canonicalFinal.startsWith(materialized)) {
      const tail = canonicalFinal.slice(state.materializedLength);
      return tail.trim().length > 0 ? tail : null;
    }
    return canonicalFinal;
  }

  reset(itemKey: string): void {
    this.stateByItem.delete(itemKey);
  }

  hasMaterializedContent(itemKey: string): boolean {
    const state = this.stateByItem.get(itemKey);
    return state !== undefined && state.materializedLength > 0;
  }

  private ensureState(itemKey: string): ReasoningLiveState {
    const existing = this.stateByItem.get(itemKey);
    if (existing) {
      return existing;
    }
    const state: ReasoningLiveState = {
      materializedLength: 0,
      nativeAccumulated: "",
      source: null,
      summaryParts: [],
    };
    this.stateByItem.set(itemKey, state);
    return state;
  }

  private tryExtractFlushSegment(state: ReasoningLiveState): string | null {
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

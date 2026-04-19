/**
 * Per-item accumulator for Codex app-server reasoning fallback text.
 *
 * User-facing reasoning is now emitted from completed summary/content blocks
 * on `item/completed`, but raw `textDelta` can still serve as a fallback when
 * final structured fields are absent.
 */

interface ReasoningLiveState {
  nativeAccumulated: string;
}

export class CodexReasoningLiveBuffer {
  private readonly stateByItem = new Map<string, ReasoningLiveState>();

  appendTextDelta(itemKey: string, deltaText: string): void {
    if (deltaText.length === 0) {
      return;
    }
    const state = this.ensureState(itemKey);
    state.nativeAccumulated += deltaText;
  }

  consumeText(itemKey: string): string | null {
    const state = this.stateByItem.get(itemKey);
    if (!state) {
      return null;
    }
    this.stateByItem.delete(itemKey);
    return state.nativeAccumulated.trim().length > 0
      ? state.nativeAccumulated
      : null;
  }

  reset(itemKey: string): void {
    this.stateByItem.delete(itemKey);
  }

  hasAccumulatedText(itemKey: string): boolean {
    const state = this.stateByItem.get(itemKey);
    return state !== undefined && state.nativeAccumulated.length > 0;
  }

  private ensureState(itemKey: string): ReasoningLiveState {
    const existing = this.stateByItem.get(itemKey);
    if (existing) {
      return existing;
    }
    const state: ReasoningLiveState = {
      nativeAccumulated: "",
    };
    this.stateByItem.set(itemKey, state);
    return state;
  }
}

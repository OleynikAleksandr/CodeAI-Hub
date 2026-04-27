export interface CodexReasoningSummaryBlock {
  readonly content: string;
  readonly index: number;
  readonly uuid: string;
}

interface ReasoningItemState {
  readonly emittedIndexes: Set<number>;
  readonly summaryParts: string[];
}

interface ReasoningItemOptions {
  readonly itemId: string;
  readonly itemKey: string;
}

const collectNonEmptyBlocks = (blocks: readonly string[]): string[] =>
  blocks.filter((block) => block.trim().length > 0);

const buildSummaryBlockUuid = (itemId: string, index: number): string =>
  `${itemId}::summary-block::${index}`;

export class CodexReasoningSummaryStreamBuffer {
  private readonly items = new Map<string, ReasoningItemState>();

  appendSummaryDelta(
    options: ReasoningItemOptions & {
      readonly delta: string;
      readonly summaryIndex: number;
    }
  ): void {
    const state = this.ensureState(options.itemKey);
    this.ensureSummarySlot(state, options.summaryIndex);
    state.summaryParts[options.summaryIndex] =
      `${state.summaryParts[options.summaryIndex] ?? ""}${options.delta}`;
  }

  startSummaryPart(
    options: ReasoningItemOptions & { readonly summaryIndex: number }
  ): CodexReasoningSummaryBlock[] {
    const state = this.ensureState(options.itemKey);
    this.ensureSummarySlot(state, options.summaryIndex);
    return this.flushAccumulatedBeforeIndex(state, {
      itemId: options.itemId,
      summaryIndex: options.summaryIndex,
    });
  }

  flushRemaining(
    options: ReasoningItemOptions & {
      readonly finalContentBlocks?: readonly string[];
      readonly finalSummaryBlocks?: readonly string[];
      readonly textFallback?: string | null;
    }
  ): CodexReasoningSummaryBlock[] {
    const state = this.items.get(options.itemKey);
    if (!state) {
      return this.flushFallbackOnly(options);
    }
    const blocks = this.flushFinalSummaryBlocks(state, {
      itemId: options.itemId,
      blocks: collectNonEmptyBlocks(options.finalSummaryBlocks ?? []),
    });
    if (blocks.length > 0) {
      this.items.delete(options.itemKey);
      return blocks;
    }
    const accumulated = this.flushAccumulatedBeforeIndex(state, {
      itemId: options.itemId,
      summaryIndex: state.summaryParts.length,
    });
    if (accumulated.length > 0) {
      this.items.delete(options.itemKey);
      return accumulated;
    }
    const finalContent = this.flushFinalSummaryBlocks(state, {
      itemId: options.itemId,
      blocks: collectNonEmptyBlocks(options.finalContentBlocks ?? []),
    });
    if (finalContent.length > 0) {
      this.items.delete(options.itemKey);
      return finalContent;
    }
    const fallback = this.flushFallbackBlock(state, options);
    this.items.delete(options.itemKey);
    return fallback;
  }

  private ensureState(itemKey: string): ReasoningItemState {
    const existing = this.items.get(itemKey);
    if (existing) {
      return existing;
    }
    const created: ReasoningItemState = {
      emittedIndexes: new Set<number>(),
      summaryParts: [],
    };
    this.items.set(itemKey, created);
    return created;
  }

  private ensureSummarySlot(
    state: ReasoningItemState,
    summaryIndex: number
  ): void {
    while (state.summaryParts.length <= summaryIndex) {
      state.summaryParts.push("");
    }
  }

  private flushAccumulatedBeforeIndex(
    state: ReasoningItemState,
    options: {
      readonly itemId: string;
      readonly summaryIndex: number;
    }
  ): CodexReasoningSummaryBlock[] {
    const blocks: CodexReasoningSummaryBlock[] = [];
    for (let index = 0; index < options.summaryIndex; index += 1) {
      const content = state.summaryParts[index]?.trim();
      if (!content || state.emittedIndexes.has(index)) {
        continue;
      }
      state.emittedIndexes.add(index);
      blocks.push({
        content,
        index,
        uuid: buildSummaryBlockUuid(options.itemId, index),
      });
    }
    return blocks;
  }

  private flushFinalSummaryBlocks(
    state: ReasoningItemState,
    options: {
      readonly blocks: readonly string[];
      readonly itemId: string;
    }
  ): CodexReasoningSummaryBlock[] {
    const emitted: CodexReasoningSummaryBlock[] = [];
    for (const [index, block] of options.blocks.entries()) {
      const content = block.trim();
      if (!content || state.emittedIndexes.has(index)) {
        continue;
      }
      state.emittedIndexes.add(index);
      emitted.push({
        content,
        index,
        uuid: buildSummaryBlockUuid(options.itemId, index),
      });
    }
    return emitted;
  }

  private flushFallbackOnly(
    options: ReasoningItemOptions & {
      readonly finalContentBlocks?: readonly string[];
      readonly finalSummaryBlocks?: readonly string[];
      readonly textFallback?: string | null;
    }
  ): CodexReasoningSummaryBlock[] {
    const summaryBlocks = collectNonEmptyBlocks(
      options.finalSummaryBlocks ?? []
    );
    if (summaryBlocks.length > 0) {
      return summaryBlocks.map((content, index) => ({
        content: content.trim(),
        index,
        uuid: buildSummaryBlockUuid(options.itemId, index),
      }));
    }
    const contentBlocks = collectNonEmptyBlocks(
      options.finalContentBlocks ?? []
    );
    if (contentBlocks.length > 0) {
      return contentBlocks.map((content, index) => ({
        content: content.trim(),
        index,
        uuid: buildSummaryBlockUuid(options.itemId, index),
      }));
    }
    const fallback = options.textFallback?.trim();
    if (!fallback) {
      return [];
    }
    return [
      {
        content: fallback,
        index: 0,
        uuid: buildSummaryBlockUuid(options.itemId, 0),
      },
    ];
  }

  private flushFallbackBlock(
    state: ReasoningItemState,
    options: ReasoningItemOptions & { readonly textFallback?: string | null }
  ): CodexReasoningSummaryBlock[] {
    const fallback = options.textFallback?.trim();
    if (!fallback || state.emittedIndexes.has(0)) {
      return [];
    }
    state.emittedIndexes.add(0);
    return [
      {
        content: fallback,
        index: 0,
        uuid: buildSummaryBlockUuid(options.itemId, 0),
      },
    ];
  }
}

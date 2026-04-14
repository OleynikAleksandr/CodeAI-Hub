import {
  collectProtectedRanges,
  resolveChunkBoundary,
} from "./translation-chunk-boundary-resolver";
import type { TranslationChunkPolicy } from "./translation-contract";

export interface PlannedTranslationChunk {
  readonly end: number;
  readonly index: number;
  readonly start: number;
  readonly text: string;
}

export interface TranslationChunkPlan {
  readonly chunkCount: number;
  readonly chunks: readonly PlannedTranslationChunk[];
}

const createSingleChunkPlan = (text: string): TranslationChunkPlan => ({
  chunkCount: 1,
  chunks: [
    {
      end: text.length,
      index: 0,
      start: 0,
      text,
    },
  ],
});

export const createTranslationChunkPlan = (
  text: string,
  chunkPolicy: TranslationChunkPolicy
): TranslationChunkPlan => {
  if (
    chunkPolicy.mode === "disabled" ||
    text.length <= chunkPolicy.softCharacterLimit
  ) {
    return createSingleChunkPlan(text);
  }

  const protectedRanges = collectProtectedRanges(text);
  const chunks: PlannedTranslationChunk[] = [];
  let chunkIndex = 0;
  let start = 0;

  while (start < text.length) {
    const end = resolveChunkBoundary(
      text,
      start,
      chunkPolicy.softCharacterLimit,
      chunkPolicy.hardCharacterLimit,
      protectedRanges
    );
    chunks.push({
      end,
      index: chunkIndex,
      start,
      text: text.slice(start, end),
    });
    chunkIndex += 1;
    start = end;
  }

  if (chunks.map((chunk) => chunk.text).join("") !== text) {
    return createSingleChunkPlan(text);
  }

  return {
    chunkCount: chunks.length,
    chunks,
  };
};

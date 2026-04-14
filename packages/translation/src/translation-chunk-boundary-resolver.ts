const CLAUSE_BREAK_PATTERN = /[;:,]\s+/gu;
const FENCED_CODE_BLOCK_PATTERN = /```[\s\S]*?```/gu;
const INLINE_CODE_PATTERN = /`[^`\n]+`/gu;
const LIST_BREAK_PATTERN = /\n(?:[-*]|\d+\.)\s/gu;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\([^)]+\)/gu;
const PARAGRAPH_BREAK_PATTERN = /\n\s*\n+/gu;
const PLACEHOLDER_PATTERN = /\{[A-Za-z0-9_]+\}/gu;
const PROTECTED_PATTERNS = [
  FENCED_CODE_BLOCK_PATTERN,
  INLINE_CODE_PATTERN,
  MARKDOWN_LINK_PATTERN,
  PLACEHOLDER_PATTERN,
  /\[\[CAIHUB_TERM_[^\]]+\]\]/gu,
] as const;
const SENTENCE_BREAK_PATTERN = /[.!?](?:["')\]]+)?\s+/gu;
const WHITESPACE_PATTERN = /\s/u;

interface ProtectedRange {
  readonly end: number;
  readonly start: number;
}

const mergeProtectedRanges = (
  ranges: readonly ProtectedRange[]
): readonly ProtectedRange[] => {
  if (ranges.length <= 1) {
    return ranges;
  }

  const sortedRanges = [...ranges].sort(
    (left, right) => left.start - right.start
  );
  const merged: ProtectedRange[] = [sortedRanges[0]];

  for (const range of sortedRanges.slice(1)) {
    const lastRange = merged.at(-1);
    if (!(lastRange && range.start <= lastRange.end)) {
      merged.push(range);
      continue;
    }

    merged[merged.length - 1] = {
      end: Math.max(lastRange.end, range.end),
      start: lastRange.start,
    };
  }

  return merged;
};

const collectPatternRanges = (
  text: string,
  pattern: RegExp
): readonly ProtectedRange[] => {
  const ranges: ProtectedRange[] = [];
  pattern.lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    if (typeof start !== "number") {
      continue;
    }
    ranges.push({
      end: start + match[0].length,
      start,
    });
  }

  return ranges;
};

const isProtectedIndex = (
  index: number,
  protectedRanges: readonly ProtectedRange[]
): boolean =>
  protectedRanges.some((range) => index >= range.start && index < range.end);

const findLastSafeBreak = (
  text: string,
  start: number,
  softEnd: number,
  hardEnd: number,
  pattern: RegExp,
  protectedRanges: readonly ProtectedRange[]
): number | null => {
  pattern.lastIndex = start;
  let bestBoundary: number | null = null;

  for (const match of text.slice(start, hardEnd).matchAll(pattern)) {
    const relativeStart = match.index;
    if (typeof relativeStart !== "number") {
      continue;
    }

    const absoluteStart = start + relativeStart;
    const absoluteEnd = absoluteStart + match[0].length;
    if (absoluteEnd <= start || absoluteEnd > hardEnd) {
      continue;
    }
    if (isProtectedIndex(absoluteStart, protectedRanges)) {
      continue;
    }
    if (absoluteEnd > softEnd && bestBoundary) {
      continue;
    }
    bestBoundary = absoluteEnd;
  }

  return bestBoundary;
};

const findHardBoundary = (
  text: string,
  start: number,
  hardEnd: number,
  protectedRanges: readonly ProtectedRange[]
): number => {
  for (let index = hardEnd; index > start; index -= 1) {
    const candidate = index - 1;
    if (isProtectedIndex(candidate, protectedRanges)) {
      continue;
    }
    if (WHITESPACE_PATTERN.test(text[candidate] ?? "")) {
      return index;
    }
  }

  for (let index = hardEnd; index > start; index -= 1) {
    const candidate = index - 1;
    if (!isProtectedIndex(candidate, protectedRanges)) {
      return index;
    }
  }

  return hardEnd;
};

export const collectProtectedRanges = (
  text: string
): readonly ProtectedRange[] =>
  mergeProtectedRanges(
    PROTECTED_PATTERNS.flatMap((pattern) => collectPatternRanges(text, pattern))
  );

export const resolveChunkBoundary = (
  text: string,
  start: number,
  softCharacterLimit: number,
  hardCharacterLimit: number,
  protectedRanges: readonly ProtectedRange[]
): number => {
  const remainingLength = text.length - start;
  if (remainingLength <= softCharacterLimit) {
    return text.length;
  }

  const softEnd = Math.min(text.length, start + softCharacterLimit);
  const hardEnd = Math.min(text.length, start + hardCharacterLimit);

  const paragraphBoundary = findLastSafeBreak(
    text,
    start,
    softEnd,
    hardEnd,
    PARAGRAPH_BREAK_PATTERN,
    protectedRanges
  );
  if (paragraphBoundary) {
    return paragraphBoundary;
  }

  const listBoundary = findLastSafeBreak(
    text,
    start,
    softEnd,
    hardEnd,
    LIST_BREAK_PATTERN,
    protectedRanges
  );
  if (listBoundary) {
    return listBoundary;
  }

  const sentenceBoundary = findLastSafeBreak(
    text,
    start,
    softEnd,
    hardEnd,
    SENTENCE_BREAK_PATTERN,
    protectedRanges
  );
  if (sentenceBoundary) {
    return sentenceBoundary;
  }

  const clauseBoundary = findLastSafeBreak(
    text,
    start,
    softEnd,
    hardEnd,
    CLAUSE_BREAK_PATTERN,
    protectedRanges
  );
  if (clauseBoundary) {
    return clauseBoundary;
  }

  return findHardBoundary(text, start, hardEnd, protectedRanges);
};

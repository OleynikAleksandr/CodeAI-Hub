const ASCII_LETTER_PATTERN = /[A-Za-z]/u;
const MIN_UNCHANGED_ENTRY_COUNT = 3;
const MAX_UNCHANGED_ENTRY_RATIO = 0.45;
const WHITESPACE_PATTERN = /\s+/gu;

const normalizeComparableText = (value: string): string =>
  value.trim().replace(WHITESPACE_PATTERN, " ");

export const resolveLikelyUntranslatedEntryCount = (params: {
  readonly sourceEntries: Record<string, string>;
  readonly translatedEntries: Record<string, string>;
}): number => {
  let comparableEntryCount = 0;
  let unchangedEntryCount = 0;

  for (const [messageId, translatedText] of Object.entries(
    params.translatedEntries
  )) {
    const sourceText = params.sourceEntries[messageId];
    if (!(sourceText && ASCII_LETTER_PATTERN.test(sourceText))) {
      continue;
    }
    comparableEntryCount += 1;
    if (
      normalizeComparableText(sourceText) ===
      normalizeComparableText(translatedText)
    ) {
      unchangedEntryCount += 1;
    }
  }

  if (comparableEntryCount === 0) {
    return 0;
  }

  return unchangedEntryCount >= MIN_UNCHANGED_ENTRY_COUNT &&
    unchangedEntryCount / comparableEntryCount >= MAX_UNCHANGED_ENTRY_RATIO
    ? unchangedEntryCount
    : 0;
};

const REVEAL_TOKEN_PATTERN = /\S+\s*|\s+/gu;
const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}_]/u;
const TARGET_REVEAL_TICKS = 90;

export const splitTranslatedTextRevealTokens = (
  content: string
): readonly string[] => content.match(REVEAL_TOKEN_PATTERN) ?? [];

export const resolveTranslatedTextRevealBatchSize = (
  tokenCount: number
): number => Math.max(1, Math.ceil(tokenCount / TARGET_REVEAL_TICKS));

export const buildTranslatedTextRevealFrame = (
  tokens: readonly string[],
  visibleTokenCount: number
): string => tokens.slice(0, Math.max(0, visibleTokenCount)).join("");

const isWordCharacter = (value: string | undefined): boolean =>
  Boolean(value && WORD_CHARACTER_PATTERN.test(value));

const trimToRevealBoundary = (
  content: string,
  prefixLength: number
): string => {
  if (prefixLength >= content.length) {
    return content;
  }
  const previous = content[prefixLength - 1];
  const next = content[prefixLength];
  if (!(isWordCharacter(previous) && isWordCharacter(next))) {
    return content.slice(0, prefixLength);
  }
  let boundary = prefixLength;
  while (boundary > 0 && isWordCharacter(content[boundary - 1])) {
    boundary -= 1;
  }
  return content.slice(0, boundary);
};

export const resolveTranslatedTextRevealPrefixText = (
  content: string,
  currentText: string
): string => {
  if (!(content && currentText)) {
    return "";
  }
  if (content.startsWith(currentText)) {
    return currentText;
  }
  const maxLength = Math.min(content.length, currentText.length);
  let prefixLength = 0;
  while (
    prefixLength < maxLength &&
    content[prefixLength] === currentText[prefixLength]
  ) {
    prefixLength += 1;
  }
  return prefixLength > 0 ? trimToRevealBoundary(content, prefixLength) : "";
};

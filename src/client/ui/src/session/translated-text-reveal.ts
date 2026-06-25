const REVEAL_TOKEN_PATTERN = /\S+\s*|\s+/gu;
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

const PARAGRAPH_SPLIT_REGEX = /\n\s*\n+/u;
const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+/u;
const WORD_SPLIT_REGEX = /\s+/u;

export interface ClaudeTranslationChunk {
  readonly joinerBefore: string;
  readonly text: string;
}

const splitLongToken = (token: string, maxChars: number): string[] => {
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < token.length) {
    parts.push(token.slice(cursor, cursor + maxChars));
    cursor += maxChars;
  }
  return parts;
};

const splitByWords = (text: string, maxChars: number): string[] => {
  const words = text
    .split(WORD_SPLIT_REGEX)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const parts: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        parts.push(current);
        current = "";
      }
      parts.push(...splitLongToken(word, maxChars));
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      parts.push(current);
    }
    current = word;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
};

const splitParagraph = (paragraph: string, maxChars: number): string[] => {
  const normalized = paragraph.trim();
  if (!(normalized && normalized.length > 0)) {
    return [];
  }
  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const sentences = normalized
    .split(SENTENCE_SPLIT_REGEX)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (sentences.length <= 1) {
    return splitByWords(normalized, maxChars);
  }

  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) {
        parts.push(current);
        current = "";
      }
      parts.push(...splitByWords(sentence, maxChars));
      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      parts.push(current);
    }
    current = sentence;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
};

const splitParagraphs = (text: string): string[] =>
  text
    .trim()
    .split(PARAGRAPH_SPLIT_REGEX)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export const buildClaudeTranslationChunks = (
  text: string,
  maxChars: number
): ClaudeTranslationChunk[] => {
  const paragraphs = splitParagraphs(text);
  const chunks: ClaudeTranslationChunk[] = [];
  let isFirstChunk = true;

  for (const paragraph of paragraphs) {
    const parts = splitParagraph(paragraph, maxChars);
    for (const [index, part] of parts.entries()) {
      let joinerBefore = "";
      if (!isFirstChunk) {
        joinerBefore = index === 0 ? "\n\n" : " ";
      }
      chunks.push({
        joinerBefore,
        text: part,
      });
      isFirstChunk = false;
    }
  }

  return chunks;
};

export const joinClaudeTranslatedChunks = (
  chunks: readonly ClaudeTranslationChunk[],
  translatedParts: readonly string[]
): string =>
  translatedParts
    .map((part, index) => `${chunks[index]?.joinerBefore ?? ""}${part.trim()}`)
    .join("")
    .trim();

export const splitClaudeDialogChunks = (
  text: string,
  maxChars: number
): string[] => {
  const paragraphs = splitParagraphs(text);
  const chunks: string[] = [];
  for (const paragraph of paragraphs) {
    chunks.push(...splitParagraph(paragraph, maxChars));
  }
  return chunks;
};

const PROTECTED_SPAN_REGEX = /```[\s\S]*?```|`[^`\n]+`/g;
const LATIN_TO_CYRILLIC_REGEX = /([A-Za-z])([А-Яа-яЁё])/g;
const CYRILLIC_TO_LATIN_REGEX = /([А-Яа-яЁё])([A-Za-z])/g;
const STANDALONE_BOLD_SECTION_TITLE_START_REGEX = /^[A-ZА-ЯЁ]/u;
const STANDALONE_BOLD_SECTION_TITLE_PUNCTUATION_REGEX = /[.!?]/u;
const SPLIT_WHITESPACE_REGEX = /\s+/u;
const BOLD_SECTION_TITLE_BOUNDARY_REGEX =
  /([^\n])(?:[ \t]*\n)?[ \t]*(\*\*([^*\n]{1,80})\*\*)(?=\n{2,})/g;
const BOLD_SECTION_TITLE_AFTER_REGEX =
  /(^|\n{2,})(\*\*([^*\n]{1,80})\*\*)(?:[ \t]+|\n(?!\n))(?=\S)/g;

interface TextSegment {
  readonly protected: boolean;
  readonly text: string;
}

const isLikelyStandaloneBoldSectionTitle = (value: string): boolean => {
  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 80) {
    return false;
  }
  if (!STANDALONE_BOLD_SECTION_TITLE_START_REGEX.test(normalized)) {
    return false;
  }
  if (STANDALONE_BOLD_SECTION_TITLE_PUNCTUATION_REGEX.test(normalized)) {
    return false;
  }
  return normalized.split(SPLIT_WHITESPACE_REGEX).length <= 12;
};

const splitProtectedSegments = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  PROTECTED_SPAN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null = PROTECTED_SPAN_REGEX.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({
        protected: false,
        text: text.slice(lastIndex, match.index),
      });
    }
    segments.push({ protected: true, text: match[0] });
    lastIndex = match.index + match[0].length;
    match = PROTECTED_SPAN_REGEX.exec(text);
  }
  if (lastIndex < text.length) {
    segments.push({ protected: false, text: text.slice(lastIndex) });
  }
  return segments;
};

const normalizeStandaloneBoldSectionBoundaries = (text: string): string => {
  let normalized = text.replace(
    BOLD_SECTION_TITLE_BOUNDARY_REGEX,
    (match, prefix: string, section: string, rawTitle: string) =>
      isLikelyStandaloneBoldSectionTitle(rawTitle)
        ? `${prefix}\n\n${section}`
        : match
  );
  normalized = normalized.replace(
    BOLD_SECTION_TITLE_AFTER_REGEX,
    (match, prefix: string, section: string, rawTitle: string) =>
      isLikelyStandaloneBoldSectionTitle(rawTitle)
        ? `${prefix}${section}\n\n`
        : match
  );
  return normalized;
};

const normalizeScriptSpacing = (text: string): string =>
  text
    .replace(LATIN_TO_CYRILLIC_REGEX, "$1 $2")
    .replace(CYRILLIC_TO_LATIN_REGEX, "$1 $2");

const normalizeNormalTextSegment = (text: string): string =>
  normalizeScriptSpacing(normalizeStandaloneBoldSectionBoundaries(text));

export const normalizeTranslationTextFormatting = (text: string): string => {
  if (text.length === 0) {
    return text;
  }
  return splitProtectedSegments(text)
    .map((segment) =>
      segment.protected
        ? segment.text
        : normalizeNormalTextSegment(segment.text)
    )
    .join("");
};

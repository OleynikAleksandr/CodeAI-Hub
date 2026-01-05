const FIELD_BLOCK_PATTERN =
  /<!--\s*field:pre_read_documents\s*-->([\s\S]*?)<!--\s*\/field\s*-->/iu;
const LINE_SPLIT_PATTERN = /\r?\n/u;
const BULLET_PREFIX_PATTERN = /^(\s*[-*+]|\s*\d+\.)\s+/u;
const SEPARATOR_PATTERN = /\s+[—–-]\s+/u;
const TOKEN_SPLIT_PATTERN = /\s+/u;
const TRAILING_PUNCTUATION_PATTERN = /[),.;:!?]+$/u;
const LINK_PATTERN = /\[[^\]]*?\]\(([^)\s]+)\)/u;
const BACKTICK_PATTERN = /`([^`]+)`/u;

const normalizeCandidate = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const cleaned = trimmed.replace(TRAILING_PUNCTUATION_PATTERN, "").trim();
  if (cleaned.length === 0) {
    return null;
  }
  if (cleaned.includes("<") || cleaned.includes(">")) {
    return null;
  }
  if (cleaned.includes("://") || cleaned.startsWith("~")) {
    return null;
  }
  if (!(cleaned.includes("/") || cleaned.includes("."))) {
    return null;
  }
  return cleaned.replace(/\\/g, "/");
};

const extractPathFromLine = (line: string): string | null => {
  const linkMatch = LINK_PATTERN.exec(line);
  if (linkMatch?.[1]) {
    return normalizeCandidate(linkMatch[1]);
  }

  const backtickMatch = BACKTICK_PATTERN.exec(line);
  if (backtickMatch?.[1]) {
    return normalizeCandidate(backtickMatch[1]);
  }

  const primary = line.split(SEPARATOR_PATTERN)[0] ?? "";
  const token = primary.trim().split(TOKEN_SPLIT_PATTERN)[0] ?? "";
  return normalizeCandidate(token);
};

export const extractPreReadPathsFromQuestionnaire = (
  markdown: string
): readonly string[] => {
  const match = FIELD_BLOCK_PATTERN.exec(markdown);
  if (!match?.[1]) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];
  const lines = match[1].split(LINE_SPLIT_PATTERN);
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0 || trimmed.startsWith("<!--")) {
      continue;
    }
    const normalizedLine = trimmed.replace(BULLET_PREFIX_PATTERN, "").trim();
    if (normalizedLine.length === 0) {
      continue;
    }
    const candidate = extractPathFromLine(normalizedLine);
    if (!candidate || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    result.push(candidate);
  }

  return result;
};

type ValidationResult =
  | { readonly ok: true; readonly normalized: string }
  | { readonly ok: false; readonly reason: string };

const PLACEHOLDER_TOKENS = [
  "<ISO_TIMESTAMP>",
  "<stage>",
  "<runSlug>",
  "<runId>",
] as const;

const PROMPT_SECTION_MARKERS = [
  "## Output rules",
  "## Inputs",
  "## Response format",
  "You will receive:",
] as const;

const ENTRY_HEADING_RE = /^###\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*$/m;
const QA_OR_NOTES_RE = /^-\s+(Q:|Notes:)\s+/m;

const stripFencedCodeBlocks = (text: string): string => {
  const lines = text.split("\n");
  const kept: string[] = [];
  let inFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
};

const validateAppendBlock = (raw: string): ValidationResult => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "empty" };
  }

  for (const token of PLACEHOLDER_TOKENS) {
    if (trimmed.includes(token)) {
      return { ok: false, reason: `contains placeholder token: ${token}` };
    }
  }

  for (const marker of PROMPT_SECTION_MARKERS) {
    if (trimmed.includes(marker)) {
      return { ok: false, reason: `looks like curator prompt echo: ${marker}` };
    }
  }

  if (!ENTRY_HEADING_RE.test(trimmed)) {
    return { ok: false, reason: "missing entry heading with ISO timestamp" };
  }

  if (!QA_OR_NOTES_RE.test(trimmed)) {
    return { ok: false, reason: "missing Q:/Notes: section" };
  }

  return { ok: true, normalized: trimmed };
};

export const normalizeWithTrailingNewline = (value: string): string =>
  value.endsWith("\n") ? value : `${value}\n`;

export const sanitizeCuratorAppendBlock = (raw: string): string | null => {
  const withoutFences = stripFencedCodeBlocks(raw);
  const startIndex = withoutFences.indexOf("## Clarifications log");
  const sliced =
    startIndex >= 0 ? withoutFences.slice(startIndex) : withoutFences;

  const lines = sliced.split("\n");
  const cleaned: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "---") {
      continue;
    }

    if (trimmed.startsWith("## Clarifications log`")) {
      cleaned.push("## Clarifications log");
      continue;
    }

    cleaned.push(line);
  }

  const result = validateAppendBlock(cleaned.join("\n"));
  return result.ok ? result.normalized : null;
};

export const hasValidCuratorMarker = (
  existingContent: string,
  marker: string
): boolean => {
  const markerIndex = existingContent.indexOf(marker);
  if (markerIndex < 0) {
    return false;
  }

  const window = existingContent.slice(markerIndex, markerIndex + 8000);
  const result = validateAppendBlock(window);
  return result.ok;
};

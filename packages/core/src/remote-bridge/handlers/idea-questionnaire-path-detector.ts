const QUESTIONNAIRE_BASENAME = "questionnaire.md";
const CANONICAL_PREFIX = ".codeai-hub/";
const DESCRIPTION_SEGMENT = "/description/";
const DESCRIPTION_QUESTIONNAIRE_SUFFIX = `${DESCRIPTION_SEGMENT}${QUESTIONNAIRE_BASENAME}`;
const LEGACY_RUNS_SEGMENT = "/description/runs/";
const LEGACY_QUESTIONNAIRE_SUFFIX = `/idea/${QUESTIONNAIRE_BASENAME}`;

const WRAPPER_PAIRS: readonly [string, string][] = [
  ["`", "`"],
  ['"', '"'],
  ["'", "'"],
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
];

const TRAILING_PUNCTUATION_PATTERN = /[),.;:!?]+$/u;
const LOCATION_HASH_SUFFIX_PATTERN = /#L\d+(?:C\d+)?$/iu;
const LOCATION_COLON_SUFFIX_PATTERN = /:(\d+)(?::\d+)?$/u;

const normalizeCandidate = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let value = trimmed;
  for (const [start, end] of WRAPPER_PAIRS) {
    if (value.startsWith(start) && value.endsWith(end)) {
      value = value.slice(start.length, -end.length).trim();
      break;
    }
  }

  value = value
    .replace(TRAILING_PUNCTUATION_PATTERN, "")
    .replace(LOCATION_HASH_SUFFIX_PATTERN, "")
    .replace(LOCATION_COLON_SUFFIX_PATTERN, "")
    .trim();

  if (value.length === 0 || value.includes("\0")) {
    return null;
  }
  if (value.includes("://") || value.startsWith("/") || value.startsWith("~")) {
    return null;
  }
  return value.replace(/\\/g, "/");
};

const CANDIDATE_PATTERN =
  /`([^`]+?)`|"([^"]+?)"|'([^']+?)'|([A-Za-z0-9_.\\/:-]*questionnaire\.md)/giu;

const extractCandidates = (message: string): readonly string[] => {
  const candidates: string[] = [];
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex scanning
  while ((match = CANDIDATE_PATTERN.exec(message))) {
    const raw = match[1] ?? match[2] ?? match[3] ?? match[4] ?? "";
    if (!raw.toLowerCase().includes(QUESTIONNAIRE_BASENAME)) {
      continue;
    }
    const normalized = normalizeCandidate(raw);
    if (normalized) {
      candidates.push(normalized);
    }
  }
  return candidates;
};

const isCanonicalDescriptionPath = (value: string): boolean => {
  const lower = value.toLowerCase();
  return (
    value.includes(CANONICAL_PREFIX) &&
    lower.endsWith(DESCRIPTION_QUESTIONNAIRE_SUFFIX)
  );
};

const isCanonicalLegacyPath = (value: string): boolean => {
  const lower = value.toLowerCase();
  return (
    value.includes(CANONICAL_PREFIX) &&
    value.includes(LEGACY_RUNS_SEGMENT) &&
    lower.endsWith(LEGACY_QUESTIONNAIRE_SUFFIX)
  );
};

const isDescriptionQuestionnairePath = (value: string): boolean =>
  value.toLowerCase().endsWith(DESCRIPTION_QUESTIONNAIRE_SUFFIX);

const isLegacyQuestionnairePath = (value: string): boolean =>
  value.toLowerCase().endsWith(LEGACY_QUESTIONNAIRE_SUFFIX);

export const detectQuestionnairePath = (message: string): string | null => {
  const candidates = extractCandidates(message);
  if (candidates.length === 0) {
    return null;
  }

  const canonical =
    candidates.find((value) => isCanonicalDescriptionPath(value)) ??
    candidates.find((value) => isCanonicalLegacyPath(value));
  if (canonical) {
    return canonical;
  }

  const questionnairePath =
    candidates.find((value) => isDescriptionQuestionnairePath(value)) ??
    candidates.find((value) => isLegacyQuestionnairePath(value));
  return questionnairePath ?? null;
};

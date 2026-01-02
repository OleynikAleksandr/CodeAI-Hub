type CandidateMatch = {
  readonly path: string;
  readonly index: number;
};

type ExtractorOptions = {
  readonly maxFiles: number;
};

const NEWLINE_SPLIT_PATTERN = /\r?\n/u;
const TRAILING_PUNCTUATION_PATTERN = /[),.;:!?]+$/u;
const LOCATION_HASH_SUFFIX_PATTERN = /#L\d+(?:C\d+)?$/iu;
const LOCATION_COLON_SUFFIX_PATTERN = /:(\d+)(?::\d+)?$/u;

const RU_TRIGGER_TOKENS: readonly string[] = [
  "прочти",
  "прочитай",
  "прочитайте",
  "прочитать",
  "ознакомься",
  "ознакомьтесь",
  "познакомься",
  "познакомьтесь",
  "изучи",
  "изучите",
  "посмотри",
  "посмотрите",
  "проверь",
  "проверьте",
  "учти",
  "учтите",
  "используй",
  "используйте",
];

const EN_TRIGGER_PATTERN = /\b(read|review|check|inspect|use)\b/iu;

const looksLikeTrigger = (text: string): boolean => {
  const lower = text.toLowerCase();
  if (RU_TRIGGER_TOKENS.some((token) => lower.includes(token))) {
    return true;
  }
  return EN_TRIGGER_PATTERN.test(text);
};

const stripTrailingPunctuation = (value: string): string =>
  value.replace(TRAILING_PUNCTUATION_PATTERN, "");

const stripWrappedToken = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  const wrappers: readonly [string, string][] = [
    ["`", "`"],
    ['"', '"'],
    ["'", "'"],
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
  ];
  for (const [start, end] of wrappers) {
    if (trimmed.startsWith(start) && trimmed.endsWith(end)) {
      return trimmed.slice(start.length, -end.length).trim();
    }
  }
  return trimmed;
};

const stripLocationSuffix = (value: string): string =>
  value
    .replace(LOCATION_HASH_SUFFIX_PATTERN, "")
    .replace(LOCATION_COLON_SUFFIX_PATTERN, "");

const normalizeCandidatePath = (raw: string): string | null => {
  const punctuationStripped = stripTrailingPunctuation(raw);
  const wrapperStripped = stripWrappedToken(punctuationStripped);
  const locationStripped = stripLocationSuffix(wrapperStripped);
  const trimmed = locationStripped.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.includes("\0")) {
    return null;
  }
  return trimmed;
};

const extractCandidatePaths = (text: string): readonly CandidateMatch[] => {
  const candidates: CandidateMatch[] = [];

  const backtick = /`([^`]+?)`/gu;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex scanning
  while ((match = backtick.exec(text))) {
    const raw = match[1] ?? "";
    const normalized = normalizeCandidatePath(raw);
    if (normalized?.includes("/")) {
      candidates.push({ path: normalized, index: match.index + 1 });
    }
  }

  const quotes = /"([^"]+?)"|'([^']+?)'/gu;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex scanning
  while ((match = quotes.exec(text))) {
    const raw = match[1] ?? match[2] ?? "";
    const normalized = normalizeCandidatePath(raw);
    if (normalized?.includes("/")) {
      candidates.push({ path: normalized, index: match.index + 1 });
    }
  }

  const plain =
    /(^|[\s(])([A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)+\.[A-Za-z0-9]{1,10}(?:#L\d+(?:C\d+)?)?(?::\d+(?::\d+)?)?)(?=$|[\s),.;:!?])/gu;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex scanning
  while ((match = plain.exec(text))) {
    const prefix = match[1] ?? "";
    const raw = match[2] ?? "";
    const normalized = normalizeCandidatePath(raw);
    if (normalized) {
      candidates.push({ path: normalized, index: match.index + prefix.length });
    }
  }

  return candidates.sort((a, b) => a.index - b.index);
};

type LimitedCollector = {
  readonly addMany: (values: readonly string[]) => void;
  readonly isFull: () => boolean;
  readonly list: () => readonly string[];
};

const createLimitedCollector = (maxFiles: number): LimitedCollector => {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const addOne = (value: string): void => {
    if (ordered.length >= maxFiles) {
      return;
    }
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    ordered.push(value);
  };

  return {
    addMany: (values) => {
      for (const value of values) {
        addOne(value);
        if (ordered.length >= maxFiles) {
          return;
        }
      }
    },
    isFull: () => ordered.length >= maxFiles,
    list: () => ordered,
  };
};

const shouldScanForPaths = (message: string): boolean =>
  message.trim().length > 0 &&
  looksLikeTrigger(message) &&
  message.includes("/");

export const extractAutoAttachPaths = (
  message: string,
  options: ExtractorOptions
): readonly string[] => {
  if (!shouldScanForPaths(message)) {
    return [];
  }

  const lines = message.split(NEWLINE_SPLIT_PATTERN);
  const collector = createLimitedCollector(options.maxFiles);

  for (const line of lines) {
    if (collector.isFull()) {
      break;
    }

    const matches = extractCandidatePaths(line);
    collector.addMany(matches.map((entry) => entry.path));
  }

  return collector.list();
};

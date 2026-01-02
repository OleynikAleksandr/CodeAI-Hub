type CandidateMatch = {
  readonly path: string;
  readonly index: number;
};

type SentenceSpan = {
  readonly start: number;
  readonly end: number;
};

type ExtractorOptions = {
  readonly maxFiles: number;
};

const MAX_TRIGGER_DISTANCE_CHARS = 200;
const MAX_COLON_FOLLOWUP_LINES = 5;

const SENTENCE_BREAK_PATTERN = /[?!;](?=\s|$)|\.(?=\s|$)/u;
const NEWLINE_SPLIT_PATTERN = /\r?\n/u;
const TRAILING_PUNCTUATION_PATTERN = /[),.;:!?]+$/u;
const LOCATION_HASH_SUFFIX_PATTERN = /#L\d+(?:C\d+)?$/iu;
const LOCATION_COLON_SUFFIX_PATTERN = /:(\d+)(?::\d+)?$/u;
const WHITESPACE_CHAR_PATTERN = /\s/u;
const WRAPPER_CHARS_PATTERN = /[`"'()[\]{}]/gu;
const LIST_DELIMITERS_PATTERN = /[\s,;]+/gu;

const TRIGGER_PATTERNS: readonly RegExp[] = [
  /\b(прочти(те)?|прочитай(те)?|прочитать)\b/iu,
  /\b(ознакомься|ознакомьтесь|познакомься|познакомьтесь)\b/iu,
  /\b(изучи(те)?|посмотри(те)?|проверь(те)?|учти(те)?|используй(те)?)\b/iu,
  /\b(read|review|check|inspect|use)\b/iu,
];

const looksLikeTrigger = (text: string): boolean =>
  TRIGGER_PATTERNS.some((pattern) => pattern.test(text));

const getTriggerOffsets = (text: string): readonly number[] => {
  const offsets: number[] = [];
  for (const pattern of TRIGGER_PATTERNS) {
    const global = new RegExp(pattern.source, `${pattern.flags}g`);
    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex scanning
    while ((match = global.exec(text))) {
      offsets.push(match.index);
    }
  }
  return offsets.sort((a, b) => a - b);
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
    /(^|[\s(])([A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)+\.[A-Za-z0-9]{1,10}(?:#L\d+(?:C\d+)?)?(?::\d+(?::\d+)?)?)(?=[$\s),.;:!?])/gu;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex scanning
  while ((match = plain.exec(text))) {
    const prefix = match[1] ?? "";
    const raw = match[2] ?? "";
    const normalized = normalizeCandidatePath(raw);
    if (normalized) {
      candidates.push({ path: normalized, index: match.index + prefix.length });
    }
  }

  return candidates;
};

const splitSentenceSpans = (line: string): readonly SentenceSpan[] => {
  const spans: SentenceSpan[] = [];
  let cursor = 0;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "." || char === "?" || char === "!" || char === ";") {
      const next = line[index + 1];
      if (!next || WHITESPACE_CHAR_PATTERN.test(next)) {
        spans.push({ start: cursor, end: index + 1 });
        cursor = index + 1;
      }
    }
  }
  spans.push({ start: cursor, end: line.length });
  return spans.filter((span) => span.end > span.start);
};

const isSameSentenceWindow = (
  line: string,
  triggerIndex: number,
  candidateIndex: number
): boolean => {
  const start = Math.min(triggerIndex, candidateIndex);
  const end = Math.max(triggerIndex, candidateIndex);
  const between = line.slice(start, end);
  return !SENTENCE_BREAK_PATTERN.test(between);
};

const pickNearbyPaths = (
  line: string,
  matches: readonly CandidateMatch[]
): readonly string[] => {
  const selected = new Set<string>();
  const spans = splitSentenceSpans(line);

  for (const span of spans) {
    const segment = line.slice(span.start, span.end);
    const triggers = getTriggerOffsets(segment);
    if (triggers.length === 0) {
      continue;
    }
    const segmentMatches = matches
      .filter(
        (candidate) =>
          candidate.index >= span.start && candidate.index < span.end
      )
      .map((candidate) => ({
        path: candidate.path,
        index: candidate.index - span.start,
      }));

    for (const candidate of segmentMatches) {
      for (const trigger of triggers) {
        if (
          Math.abs(candidate.index - trigger) <= MAX_TRIGGER_DISTANCE_CHARS &&
          isSameSentenceWindow(segment, trigger, candidate.index)
        ) {
          selected.add(candidate.path);
          break;
        }
      }
    }
  }

  return Array.from(selected);
};

const isPathListLine = (
  line: string,
  matches: readonly CandidateMatch[]
): boolean => {
  if (matches.length === 0) {
    return false;
  }
  let remaining = line;
  for (const candidate of matches) {
    remaining = remaining.replace(candidate.path, "");
  }
  const normalized = remaining
    .replace(WRAPPER_CHARS_PATTERN, "")
    .replace(LIST_DELIMITERS_PATTERN, "")
    .trim();
  return normalized.length === 0;
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

const collectFollowUpPaths = (
  lines: readonly string[],
  startIndex: number
): readonly string[] => {
  const collected: string[] = [];

  for (let offset = 1; offset <= MAX_COLON_FOLLOWUP_LINES; offset += 1) {
    const followUp = lines[startIndex + offset] ?? "";
    if (followUp.trim().length === 0) {
      break;
    }
    const followMatches = extractCandidatePaths(followUp);
    if (!isPathListLine(followUp, followMatches)) {
      break;
    }
    for (const candidate of followMatches.map((entry) => entry.path)) {
      collected.push(candidate);
    }
  }

  return collected;
};

export const extractAutoAttachPaths = (
  message: string,
  options: ExtractorOptions
): readonly string[] => {
  if (!shouldScanForPaths(message)) {
    return [];
  }

  const lines = message.split(NEWLINE_SPLIT_PATTERN);
  const collector = createLimitedCollector(options.maxFiles);

  for (let index = 0; index < lines.length; index += 1) {
    if (collector.isFull()) {
      break;
    }

    const line = lines[index] ?? "";
    const matches = extractCandidatePaths(line);
    const nearby = pickNearbyPaths(line, matches);
    collector.addMany(nearby);

    if (collector.isFull()) {
      break;
    }

    const trimmed = line.trim();
    if (
      !(
        looksLikeTrigger(trimmed) &&
        trimmed.endsWith(":") &&
        nearby.length === 0
      )
    ) {
      continue;
    }

    const followUps = collectFollowUpPaths(lines, index);
    collector.addMany(followUps);
  }

  return collector.list();
};

export type UsageLimitBucket = {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
};

export type UsageLimitsSnapshot = {
  readonly currentSession: UsageLimitBucket | null;
  readonly currentWeekAllModels: UsageLimitBucket | null;
  readonly currentWeekSonnetOnly: UsageLimitBucket | null;
};

const PERCENT_PATTERN = /(\d+)\s*%/i;
const CURRENT_SESSION_HEADER = /Current session/i;
const CURRENT_WEEK_ALL_MODELS_HEADER = /Current week\s*\(all models\)/i;

const LOCAL_COMMAND_STDOUT_PATTERN =
  /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/;

const extractLocalCommandStdout = (value: string): string | null => {
  const match = LOCAL_COMMAND_STDOUT_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  return match[1];
};

const collectStrings = (root: unknown): string[] => {
  const out: string[] = [];
  const queue: unknown[] = [root];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = queue.pop();
    if (typeof current === "string") {
      out.push(current);
      continue;
    }
    if (!current || typeof current !== "object") {
      continue;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (Array.isArray(current)) {
      for (const item of current) {
        queue.push(item);
      }
      continue;
    }

    for (const value of Object.values(current as Record<string, unknown>)) {
      queue.push(value);
    }
  }

  return out;
};

const parsePercent = (value: string): number | null => {
  const match = PERCENT_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  const percent = Number.parseInt(match[1], 10);
  if (!Number.isFinite(percent)) {
    return null;
  }
  if (percent < 0) {
    return 0;
  }
  if (percent > 100) {
    return 100;
  }
  return percent;
};

const parseBucket = (text: string, header: RegExp): UsageLimitBucket | null => {
  const percentMatch = new RegExp(
    `${header.source}[\\s\\S]*?(\\d+\\s*%\\s*used)`,
    header.flags.includes("i") ? "i" : undefined
  ).exec(text);
  if (!percentMatch) {
    return null;
  }

  const percentUsed = parsePercent(percentMatch[1]);
  if (percentUsed === null) {
    return null;
  }

  const resetsMatch = new RegExp(
    `${header.source}[\\s\\S]*?\\bResets\\b\\s+([^\\r\\n]+)`,
    header.flags.includes("i") ? "i" : undefined
  ).exec(text);
  const resetsAt = resetsMatch?.[1]?.trim() ? resetsMatch[1].trim() : null;

  return { percentUsed, resetsAt };
};

const extractLimitsSnapshot = (text: string): UsageLimitsSnapshot | null => {
  const currentSession = parseBucket(text, CURRENT_SESSION_HEADER);
  const currentWeekAllModels = parseBucket(
    text,
    CURRENT_WEEK_ALL_MODELS_HEADER
  );
  // "Current week (Sonnet only)" is currently not used by CodeAI Hub.
  const currentWeekSonnetOnly: UsageLimitBucket | null = null;

  if (!(currentSession || currentWeekAllModels)) {
    return null;
  }

  return {
    currentSession,
    currentWeekAllModels,
    currentWeekSonnetOnly,
  };
};

export const extractUsageLimitsFromStreamJsonLine = (
  line: string
): UsageLimitsSnapshot | null => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }

  for (const candidate of collectStrings(parsed)) {
    const localStdout = extractLocalCommandStdout(candidate);
    if (localStdout) {
      const snapshot = extractLimitsSnapshot(localStdout);
      if (snapshot) {
        return snapshot;
      }
    }

    const snapshot = extractLimitsSnapshot(candidate);
    if (snapshot) {
      return snapshot;
    }
  }

  return null;
};

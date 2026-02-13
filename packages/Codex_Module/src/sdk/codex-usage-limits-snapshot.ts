export type CodexUsageLimitBucket = {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
};

export type CodexUsageLimitsSnapshot = {
  readonly currentSession: CodexUsageLimitBucket | null;
  readonly currentWeekAllModels: CodexUsageLimitBucket | null;
  readonly currentWeekSonnetOnly: CodexUsageLimitBucket | null;
};

const DIGITS_ONLY_PATTERN = /^\d+$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const clampPercent = (value: number): number => {
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
};

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const toIsoFromEpoch = (
  value: number,
  isMilliseconds: boolean
): string | null => {
  const epochMs = isMilliseconds ? value : value * 1000;
  const date = new Date(epochMs);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeStringResetAt = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!DIGITS_ONLY_PATTERN.test(trimmed)) {
    return trimmed;
  }
  const numeric = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return toIsoFromEpoch(numeric, trimmed.length >= 13);
};

const normalizeNumberResetAt = (value: number): string | null => {
  if (!Number.isFinite(value)) {
    return null;
  }
  return toIsoFromEpoch(value, value >= 1_000_000_000_000);
};

const normalizeResetAt = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return normalizeStringResetAt(value);
  }
  if (typeof value === "number") {
    return normalizeNumberResetAt(value);
  }
  return null;
};

const parseRateLimitBucket = (value: unknown): CodexUsageLimitBucket | null => {
  if (!isRecord(value)) {
    return null;
  }
  const usedPercent = readNumber(value.used_percent);
  if (usedPercent === null) {
    return null;
  }
  return {
    percentUsed: clampPercent(Math.round(usedPercent)),
    resetsAt: normalizeResetAt(value.resets_at),
  };
};

const extractFromEvent = (event: unknown): CodexUsageLimitsSnapshot | null => {
  if (!isRecord(event) || event.type !== "event_msg") {
    return null;
  }
  const payload = isRecord(event.payload) ? event.payload : null;
  if (!payload || payload.type !== "token_count") {
    return null;
  }
  const rateLimits = isRecord(payload.rate_limits) ? payload.rate_limits : null;
  if (!rateLimits) {
    return null;
  }

  const currentSession = parseRateLimitBucket(rateLimits.primary);
  const currentWeekAllModels = parseRateLimitBucket(rateLimits.secondary);
  const currentWeekSonnetOnly: CodexUsageLimitBucket | null = null;

  if (!(currentSession || currentWeekAllModels)) {
    return null;
  }

  return {
    currentSession,
    currentWeekAllModels,
    currentWeekSonnetOnly,
  };
};

export const extractLatestUsageLimitsFromRollout = (
  events: readonly unknown[]
): CodexUsageLimitsSnapshot | null => {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const snapshot = extractFromEvent(events[index]);
    if (snapshot) {
      return snapshot;
    }
  }
  return null;
};

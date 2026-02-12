export type UsageLimitBucket = {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
};

export type UsageLimitsSnapshot = {
  readonly currentSession: UsageLimitBucket | null;
  readonly currentWeekAllModels: UsageLimitBucket | null;
  readonly currentWeekSonnetOnly: UsageLimitBucket | null;
};

type RateLimitWindow = "5h" | "7d";

type ParsedWindowHeaders = {
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly reset: string | null;
};
const DIGITS_ONLY_PATTERN = /^\d+$/;

const clampPercent = (value: number): number => {
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
};

const parseNumber = (value: string | null): number | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
};

const normalizeResetValue = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!DIGITS_ONLY_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const numeric = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(numeric)) {
    return trimmed;
  }

  const timestampMs = trimmed.length >= 13 ? numeric : numeric * 1000;
  const parsedDate = new Date(timestampMs);
  if (Number.isNaN(parsedDate.getTime())) {
    return trimmed;
  }
  return parsedDate.toISOString();
};

const readHeader = (
  headers: ReadonlyMap<string, string>,
  keys: readonly string[]
): string | null => {
  for (const key of keys) {
    const value = headers.get(key);
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const parseWindowHeaders = (
  headers: ReadonlyMap<string, string>,
  window: RateLimitWindow
): ParsedWindowHeaders => {
  const prefix = `anthropic-ratelimit-unified-${window}-`;

  const limit = parseNumber(
    readHeader(headers, [
      `${prefix}limit`,
      `${prefix}requests-limit`,
      `${prefix}tokens-limit`,
    ])
  );
  const remaining = parseNumber(
    readHeader(headers, [
      `${prefix}remaining`,
      `${prefix}requests-remaining`,
      `${prefix}tokens-remaining`,
    ])
  );
  const reset = normalizeResetValue(
    readHeader(headers, [
      `${prefix}reset`,
      `${prefix}requests-reset`,
      `${prefix}tokens-reset`,
      `${prefix}resets-at`,
    ])
  );

  return { limit, remaining, reset };
};

const buildBucket = (payload: ParsedWindowHeaders): UsageLimitBucket | null => {
  if (
    payload.limit === null ||
    payload.remaining === null ||
    payload.limit <= 0
  ) {
    return null;
  }

  const used = Math.max(0, payload.limit - payload.remaining);
  const percentUsed = clampPercent(Math.round((used / payload.limit) * 100));
  return {
    percentUsed,
    resetsAt: payload.reset,
  };
};

export const extractUsageLimitsFromRateLimitHeaders = (
  headers: ReadonlyMap<string, string>
): UsageLimitsSnapshot | null => {
  const currentSession = buildBucket(parseWindowHeaders(headers, "5h"));
  const currentWeekAllModels = buildBucket(parseWindowHeaders(headers, "7d"));
  // Keep disabled to preserve existing UI contract.
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

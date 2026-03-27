import type {
  ProviderUsageLimitSource,
  ProviderUsageLimitsSnapshot,
  ProviderUsageLimitWindow,
} from "../../provider-usage-limits-types";

type RateLimitWindow = "5h" | "7d";

interface ParsedWindowHeaders {
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly reset: string | null;
  readonly utilizationPercent: number | null;
}

type ClaudeUsageLimitSource = Extract<
  ProviderUsageLimitSource,
  "claude_headers" | "claude_probe"
>;

export interface ClaudeUsageLimitsNormalizeInput {
  readonly collectedAt?: string;
  readonly headers: ReadonlyMap<string, string>;
  readonly providerScopeKey: string;
  readonly source?: ClaudeUsageLimitSource;
}

const DIGITS_ONLY_PATTERN = /^\d+$/;

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return Math.round(value);
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
  return Number.isFinite(parsed) ? parsed : null;
};

const parseUtilizationPercent = (value: string | null): number | null => {
  const parsed = parseNumber(value);
  if (parsed === null || parsed < 0) {
    return null;
  }
  return clampPercent(parsed <= 1 ? parsed * 100 : parsed);
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
  return Number.isNaN(parsedDate.getTime())
    ? trimmed
    : parsedDate.toISOString();
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

  return {
    limit: parseNumber(
      readHeader(headers, [
        `${prefix}limit`,
        `${prefix}requests-limit`,
        `${prefix}tokens-limit`,
      ])
    ),
    remaining: parseNumber(
      readHeader(headers, [
        `${prefix}remaining`,
        `${prefix}requests-remaining`,
        `${prefix}tokens-remaining`,
      ])
    ),
    utilizationPercent: parseUtilizationPercent(
      readHeader(headers, [
        `${prefix}utilization`,
        `${prefix}requests-utilization`,
        `${prefix}tokens-utilization`,
      ])
    ),
    reset: normalizeResetValue(
      readHeader(headers, [
        `${prefix}reset`,
        `${prefix}requests-reset`,
        `${prefix}tokens-reset`,
        `${prefix}resets-at`,
      ])
    ),
  };
};

const buildUsageWindow = (payload: {
  readonly id: ProviderUsageLimitWindow["id"];
  readonly label: string;
  readonly parsed: ParsedWindowHeaders;
  readonly windowKind: ProviderUsageLimitWindow["windowKind"];
}): ProviderUsageLimitWindow | null => {
  const { id, label, parsed, windowKind } = payload;
  if (parsed.limit !== null && parsed.remaining !== null && parsed.limit > 0) {
    const used = Math.max(0, parsed.limit - parsed.remaining);
    return {
      id,
      label,
      percentUsed: clampPercent((used / parsed.limit) * 100),
      resetsAt: parsed.reset,
      windowKind,
    };
  }

  if (parsed.utilizationPercent === null) {
    return null;
  }

  return {
    id,
    label,
    percentUsed: parsed.utilizationPercent,
    resetsAt: parsed.reset,
    windowKind,
  };
};

export class ClaudeUsageLimitsNormalizer {
  normalize(
    input: ClaudeUsageLimitsNormalizeInput
  ): ProviderUsageLimitsSnapshot | null {
    const windows = [
      buildUsageWindow({
        id: "primary",
        label: "Session",
        parsed: parseWindowHeaders(input.headers, "5h"),
        windowKind: "session",
      }),
      buildUsageWindow({
        id: "secondary",
        label: "Weekly",
        parsed: parseWindowHeaders(input.headers, "7d"),
        windowKind: "weekly",
      }),
    ].filter((window): window is ProviderUsageLimitWindow => window !== null);

    if (windows.length === 0) {
      return null;
    }

    return {
      collectedAt: input.collectedAt ?? new Date().toISOString(),
      providerId: "claude",
      providerScopeKey: input.providerScopeKey,
      source: input.source ?? "claude_probe",
      windows,
    };
  }
}

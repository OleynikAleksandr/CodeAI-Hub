import type { CodexUsageLimits, CodexUsageLimitsStreamPayload } from "../types";

export interface RateLimitBucket {
  readonly resetsAt?: unknown;
  readonly usedPercent?: unknown;
}

export interface RateLimitSnapshot {
  readonly primary?: RateLimitBucket | null;
  readonly secondary?: RateLimitBucket | null;
}

const DEFAULT_PROVIDER_SCOPE_KEY = "codex";
const DIGITS_ONLY_PATTERN = /^\d+$/;

const nowIso = (): string => new Date().toISOString();

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toIsoFromEpoch = (
  value: number,
  isMilliseconds: boolean
): string | null => {
  const epochMs = isMilliseconds ? value : value * 1000;
  const date = new Date(epochMs);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeResetAt = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return toIsoFromEpoch(value, value >= 1_000_000_000_000);
  }
  if (typeof value !== "string") {
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
  return Number.isFinite(numeric)
    ? toIsoFromEpoch(numeric, trimmed.length >= 13)
    : null;
};

export const buildUsageLimits = (
  snapshot: RateLimitSnapshot | null
): CodexUsageLimits => {
  if (!snapshot) {
    return null;
  }
  return {
    currentSession: snapshot.primary
      ? {
          percentUsed: readNumber(snapshot.primary.usedPercent) ?? 0,
          resetsAt: normalizeResetAt(snapshot.primary.resetsAt),
        }
      : null,
    currentWeekAllModels: snapshot.secondary
      ? {
          percentUsed: readNumber(snapshot.secondary.usedPercent) ?? 0,
          resetsAt: normalizeResetAt(snapshot.secondary.resetsAt),
        }
      : null,
  };
};

export const buildUsageLimitsPayload = (
  usageLimits: NonNullable<CodexUsageLimits>
): CodexUsageLimitsStreamPayload => ({
  providerScopeKey: DEFAULT_PROVIDER_SCOPE_KEY,
  usageLimits,
  data: {
    kind: "usage_limits",
    usageLimits,
    providerScopeKey: DEFAULT_PROVIDER_SCOPE_KEY,
    source: "app_server",
    collectedAt: nowIso(),
  },
});

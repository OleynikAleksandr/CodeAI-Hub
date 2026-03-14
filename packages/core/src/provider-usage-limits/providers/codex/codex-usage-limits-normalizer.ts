import type {
  ProviderUsageLimitBucket,
  ProviderUsageLimitSource,
  ProviderUsageLimitsSnapshot,
  ProviderUsageLimitWindow,
} from "../../provider-usage-limits-types";

type CodexUsageLimitSource = Extract<
  ProviderUsageLimitSource,
  "codex_rollout_fallback" | "codex_rpc"
>;

export type CodexRolloutUsageLimitsSnapshot = {
  readonly collectedAt: string | null;
  readonly currentSession: ProviderUsageLimitBucket | null;
  readonly currentWeekAllModels: ProviderUsageLimitBucket | null;
  readonly currentWeekSonnetOnly: ProviderUsageLimitBucket | null;
};

export type CodexUsageLimitsNormalizeInput = {
  readonly collectedAt?: string;
  readonly providerScopeKey: string;
  readonly snapshot: CodexRolloutUsageLimitsSnapshot;
  readonly source?: CodexUsageLimitSource;
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
  return Math.round(value);
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

const normalizeResetAt = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
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

const parseRateLimitBucket = (
  value: unknown
): ProviderUsageLimitBucket | null => {
  if (!isRecord(value)) {
    return null;
  }
  const usedPercent = readNumber(value.used_percent);
  if (usedPercent === null) {
    return null;
  }
  return {
    percentUsed: clampPercent(usedPercent),
    resetsAt: normalizeResetAt(value.resets_at),
  };
};

export const extractCodexUsageLimitsSnapshotFromRateLimits = (payload: {
  readonly collectedAt?: string | null;
  readonly rateLimits: unknown;
}): CodexRolloutUsageLimitsSnapshot | null => {
  const rateLimits = isRecord(payload.rateLimits) ? payload.rateLimits : null;
  if (!rateLimits) {
    return null;
  }

  const currentSession = parseRateLimitBucket(rateLimits.primary);
  const currentWeekAllModels = parseRateLimitBucket(rateLimits.secondary);
  const currentWeekSonnetOnly = parseRateLimitBucket(rateLimits.tertiary);
  if (!(currentSession || currentWeekAllModels || currentWeekSonnetOnly)) {
    return null;
  }

  return {
    collectedAt: payload.collectedAt ?? null,
    currentSession,
    currentWeekAllModels,
    currentWeekSonnetOnly,
  };
};

const extractFromEvent = (
  event: unknown
): CodexRolloutUsageLimitsSnapshot | null => {
  if (!isRecord(event) || event.type !== "event_msg") {
    return null;
  }
  const payload = isRecord(event.payload) ? event.payload : null;
  if (!payload || payload.type !== "token_count") {
    return null;
  }
  return extractCodexUsageLimitsSnapshotFromRateLimits({
    collectedAt: typeof event.timestamp === "string" ? event.timestamp : null,
    rateLimits: payload.rate_limits,
  });
};

const buildWindow = (payload: {
  readonly id: ProviderUsageLimitWindow["id"];
  readonly label: string;
  readonly bucket: ProviderUsageLimitBucket | null;
  readonly windowKind: ProviderUsageLimitWindow["windowKind"];
}): ProviderUsageLimitWindow | null => {
  if (!payload.bucket) {
    return null;
  }
  return {
    id: payload.id,
    label: payload.label,
    percentUsed: payload.bucket.percentUsed,
    resetsAt: payload.bucket.resetsAt,
    windowKind: payload.windowKind,
  };
};

export const extractLatestUsageLimitsFromRollout = (
  events: readonly unknown[]
): CodexRolloutUsageLimitsSnapshot | null => {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const snapshot = extractFromEvent(events[index]);
    if (snapshot) {
      return snapshot;
    }
  }
  return null;
};

export class CodexUsageLimitsNormalizer {
  normalize(
    input: CodexUsageLimitsNormalizeInput
  ): ProviderUsageLimitsSnapshot | null {
    const windows = [
      buildWindow({
        id: "primary",
        label: "Session",
        bucket: input.snapshot.currentSession,
        windowKind: "session",
      }),
      buildWindow({
        id: "secondary",
        label: "Weekly",
        bucket: input.snapshot.currentWeekAllModels,
        windowKind: "weekly",
      }),
      buildWindow({
        id: "tertiary",
        label: "Sonnet Weekly",
        bucket: input.snapshot.currentWeekSonnetOnly,
        windowKind: "model-weekly",
      }),
    ].filter((window): window is ProviderUsageLimitWindow => window !== null);

    if (windows.length === 0) {
      return null;
    }

    return {
      collectedAt:
        input.snapshot.collectedAt ??
        input.collectedAt ??
        new Date().toISOString(),
      providerId: "codex",
      providerScopeKey: input.providerScopeKey,
      source: input.source ?? "codex_rollout_fallback",
      windows,
    };
  }
}

import type {
  ProviderUsageLimitSource,
  ProviderUsageLimitsSnapshot,
  ProviderUsageLimitWindow,
} from "../../provider-usage-limits-types";

type GeminiUsageLimitSource = Extract<
  ProviderUsageLimitSource,
  "gemini_quota_api"
>;

export interface GeminiQuotaApiBucket {
  readonly modelId?: string | null;
  readonly remainingAmount?: string | null;
  readonly remainingFraction?: number | null;
  readonly resetTime?: string | null;
  readonly tokenType?: string | null;
}

export interface GeminiQuotaApiSnapshot {
  readonly activeModel?: string | null;
  readonly buckets: readonly GeminiQuotaApiBucket[];
  readonly collectedAt: string;
}

export interface GeminiUsageLimitsNormalizeInput {
  readonly providerScopeKey: string;
  readonly snapshot: GeminiQuotaApiSnapshot;
  readonly source?: GeminiUsageLimitSource;
}

interface GeminiWindowCandidate {
  readonly priority: number;
  readonly window: Omit<ProviderUsageLimitWindow, "id">;
}

const MAX_COMPAT_WINDOWS = 3;
const DAILY_WINDOW_THRESHOLD_MS = 36 * 60 * 60 * 1000;

/**
 * Known Gemini models — only these appear in rate-limit labels.
 * Key: raw model ID returned by Google Quota API (lowercase).
 * Value: human-readable display name shown in UI.
 */
const GEMINI_MODEL_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  "gemini-3.1-pro-preview": "Gemini 3.1 Pro",
  "gemini-3-flash-preview": "Gemini 3 Flash",
};

const resolveModelDisplayName = (modelId: string | null): string | null => {
  if (!modelId) {
    return null;
  }
  return GEMINI_MODEL_DISPLAY_NAMES[modelId.toLowerCase()] ?? null;
};

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return Math.round(value);
};

const normalizeFraction = (value: number | null | undefined): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value >= 0 && value <= 1) {
    return value;
  }
  if (value > 1 && value <= 100) {
    return value / 100;
  }
  return null;
};

const normalizeResetTime = (
  value: string | null | undefined
): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsedDate = new Date(trimmed);
  return Number.isNaN(parsedDate.getTime())
    ? trimmed
    : parsedDate.toISOString();
};

const formatTokenType = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/_/g, " ");
  if (!normalized) {
    return null;
  }
  return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
};

const normalizeActiveModel = (
  value: string | null | undefined
): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith("auto-") ? trimmed.slice(5) : trimmed;
};

const matchesActiveModel = (
  modelId: string | null,
  activeModel: string | null
): boolean => {
  if (!(modelId && activeModel)) {
    return false;
  }

  const normalizedModelId = modelId.toLowerCase();
  if (normalizedModelId === activeModel) {
    return true;
  }

  return (
    normalizedModelId.includes(activeModel) ||
    activeModel.includes(normalizedModelId)
  );
};

const resolveWindowKind = (
  resetsAt: string | null,
  collectedAt: string
): ProviderUsageLimitWindow["windowKind"] => {
  if (!resetsAt) {
    return "provider-specific";
  }

  const resetMs = new Date(resetsAt).getTime();
  const collectedAtMs = new Date(collectedAt).getTime();
  if (!(Number.isFinite(resetMs) && Number.isFinite(collectedAtMs))) {
    return "provider-specific";
  }

  const diffMs = resetMs - collectedAtMs;
  if (diffMs > 0 && diffMs <= DAILY_WINDOW_THRESHOLD_MS) {
    return "daily";
  }

  return "provider-specific";
};

const buildPriority = (payload: {
  readonly activeModel: string | null;
  readonly modelId: string | null;
  readonly percentUsed: number;
  readonly tokenType: string | null;
}): number => {
  let priority = payload.percentUsed;

  if (matchesActiveModel(payload.modelId, payload.activeModel)) {
    priority += 200;
  }

  const normalizedModelId = payload.modelId?.toLowerCase() ?? "";
  if (normalizedModelId.includes("pro")) {
    priority += 40;
  }
  if (normalizedModelId.includes("flash")) {
    priority += 20;
  }
  if (normalizedModelId.includes("lite")) {
    priority -= 10;
  }

  if (payload.tokenType === "Requests") {
    priority += 15;
  }

  return priority;
};

const buildWindowCandidate = (
  snapshot: GeminiQuotaApiSnapshot,
  bucket: GeminiQuotaApiBucket
): GeminiWindowCandidate | null => {
  const remainingFraction = normalizeFraction(bucket.remainingFraction);
  if (remainingFraction === null) {
    return null;
  }

  const resetsAt = normalizeResetTime(bucket.resetTime);
  const modelId =
    typeof bucket.modelId === "string" && bucket.modelId.trim().length > 0
      ? bucket.modelId.trim()
      : null;
  // Skip buckets for models not in our known registry
  const displayName = resolveModelDisplayName(modelId);
  if (modelId && !displayName) {
    return null;
  }
  const tokenType = formatTokenType(bucket.tokenType);
  const label = [displayName ?? "Gemini Quota", tokenType]
    .filter((value): value is string => Boolean(value))
    .join(" ");
  const percentUsed = clampPercent((1 - remainingFraction) * 100);

  return {
    priority: buildPriority({
      activeModel: normalizeActiveModel(snapshot.activeModel),
      modelId,
      percentUsed,
      tokenType,
    }),
    window: {
      label,
      percentUsed,
      resetsAt,
      windowKind: resolveWindowKind(resetsAt, snapshot.collectedAt),
    },
  };
};

const assignWindowId = (
  index: number
): ProviderUsageLimitWindow["id"] | null => {
  if (index === 0) {
    return "primary";
  }
  if (index === 1) {
    return "secondary";
  }
  if (index === 2) {
    return "tertiary";
  }
  return null;
};

export class GeminiUsageLimitsNormalizer {
  normalize(
    input: GeminiUsageLimitsNormalizeInput
  ): ProviderUsageLimitsSnapshot | null {
    const windows = input.snapshot.buckets
      .map((bucket) => buildWindowCandidate(input.snapshot, bucket))
      .filter(
        (candidate): candidate is GeminiWindowCandidate => candidate !== null
      )
      .sort(
        (left, right) =>
          right.priority - left.priority ||
          right.window.percentUsed - left.window.percentUsed ||
          left.window.label.localeCompare(right.window.label)
      )
      .slice(0, MAX_COMPAT_WINDOWS)
      .map((candidate, index) => {
        const id = assignWindowId(index);
        if (!id) {
          return null;
        }
        return {
          id,
          ...candidate.window,
        };
      })
      .filter((window): window is ProviderUsageLimitWindow => window !== null);

    if (windows.length === 0) {
      return null;
    }

    return {
      collectedAt: input.snapshot.collectedAt,
      providerId: "gemini",
      providerScopeKey: input.providerScopeKey,
      source: input.source ?? "gemini_quota_api",
      windows,
    };
  }
}

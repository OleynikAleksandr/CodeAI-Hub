import type { SessionSnapshot } from "../../../../types/session";
import type { SessionSnapshots } from "../session/helpers";
import { writeLastKnownTokenUsage } from "../session/token-usage-cache";
import { writeLastKnownUsageLimits } from "../session/usage-limits-cache";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, value));

type TokenUsage = { readonly used: number; readonly limit: number };

const readTokenUsage = (value: unknown): TokenUsage | null => {
  if (!isRecord(value)) {
    return null;
  }
  const used = readNumber(value.used);
  const limit = readNumber(value.limit);
  if (used === null || limit === null) {
    return null;
  }
  if (used < 0 || limit <= 0) {
    return null;
  }
  return { used: Math.round(used), limit: Math.round(limit) };
};

const extractTokenUsage = (
  event: unknown
): {
  readonly tokenUsage: TokenUsage;
  readonly threadId: string | null;
} | null => {
  if (!isRecord(event)) {
    return null;
  }

  const direct = readTokenUsage(event.tokenUsage);
  if (direct) {
    return { tokenUsage: direct, threadId: readString(event.threadId) };
  }

  const data = isRecord(event.data) ? event.data : null;
  if (!data || data.kind !== "token_usage") {
    return null;
  }

  const tokenUsage = readTokenUsage(data);
  if (!tokenUsage) {
    return null;
  }
  return { tokenUsage, threadId: readString(event.threadId) };
};

type UsageLimitBucket = {
  readonly percentUsed: number;
  readonly resetsAt?: string | null;
};

type UsageLimits = {
  readonly currentSession?: UsageLimitBucket | null;
  readonly currentWeekAllModels?: UsageLimitBucket | null;
  readonly currentWeekSonnetOnly?: UsageLimitBucket | null;
};

const readUsageLimitBucket = (value: unknown): UsageLimitBucket | null => {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }
  const percentUsed = readNumber(value.percentUsed);
  if (percentUsed === null) {
    return null;
  }
  return {
    percentUsed: clampPercent(Math.round(percentUsed)),
    resetsAt: readString(value.resetsAt),
  };
};

const extractUsageLimits = (event: unknown): UsageLimits | null => {
  if (!isRecord(event)) {
    return null;
  }

  let root: Record<string, unknown> | null = null;
  if (isRecord(event.usageLimits)) {
    root = event.usageLimits;
  } else if (isRecord(event.data)) {
    root = event.data;
  }

  const candidate =
    isRecord(root) && isRecord(root.usageLimits) ? root.usageLimits : root;

  if (!isRecord(candidate)) {
    return null;
  }

  const currentSession = readUsageLimitBucket(candidate.currentSession);
  const currentWeekAllModels = readUsageLimitBucket(
    candidate.currentWeekAllModels
  );
  const currentWeekSonnetOnly = readUsageLimitBucket(
    candidate.currentWeekSonnetOnly
  );

  if (!(currentSession || currentWeekAllModels || currentWeekSonnetOnly)) {
    return null;
  }

  return { currentSession, currentWeekAllModels, currentWeekSonnetOnly };
};

const areUsageLimitBucketsEqual = (
  left: UsageLimitBucket | null | undefined,
  right: UsageLimitBucket | null | undefined
): boolean =>
  left?.percentUsed === right?.percentUsed &&
  left?.resetsAt === right?.resetsAt;

const areUsageLimitsEqual = (
  left: UsageLimits | null | undefined,
  right: UsageLimits
): boolean =>
  Boolean(
    left &&
      areUsageLimitBucketsEqual(left.currentSession, right.currentSession) &&
      areUsageLimitBucketsEqual(
        left.currentWeekAllModels,
        right.currentWeekAllModels
      ) &&
      areUsageLimitBucketsEqual(
        left.currentWeekSonnetOnly,
        right.currentWeekSonnetOnly
      )
  );

const normalizeProviderKey = (value: string): string =>
  value.trim().toLowerCase();

export const applyTokenUsageSyncFromStreamEvent = (payload: {
  readonly snapshots: SessionSnapshots;
  readonly sessionId: string;
  readonly snapshot: SessionSnapshot;
  readonly event?: unknown;
  readonly updatedAt: number;
}): {
  readonly snapshots: SessionSnapshots;
  readonly snapshot: SessionSnapshot;
} => {
  const tokenUsagePayload = extractTokenUsage(payload.event);
  if (!tokenUsagePayload) {
    return { snapshots: payload.snapshots, snapshot: payload.snapshot };
  }

  const currentTokenUsage = payload.snapshot.status.tokenUsage;
  if (
    currentTokenUsage.used === tokenUsagePayload.tokenUsage.used &&
    currentTokenUsage.limit === tokenUsagePayload.tokenUsage.limit
  ) {
    return { snapshots: payload.snapshots, snapshot: payload.snapshot };
  }

  const providerSessionId =
    payload.snapshot.binding.providerSessionId ?? tokenUsagePayload.threadId;
  if (providerSessionId) {
    writeLastKnownTokenUsage(providerSessionId, tokenUsagePayload.tokenUsage);
  }

  const nextSnapshot: SessionSnapshot = {
    ...payload.snapshot,
    status: {
      ...payload.snapshot.status,
      tokenUsage: tokenUsagePayload.tokenUsage,
      updatedAt: payload.updatedAt,
    },
  };

  return {
    snapshots: { ...payload.snapshots, [payload.sessionId]: nextSnapshot },
    snapshot: nextSnapshot,
  };
};

export const applyUsageLimitsSyncFromStreamEvent = (payload: {
  readonly snapshots: SessionSnapshots;
  readonly sessionId: string;
  readonly snapshot: SessionSnapshot;
  readonly event?: unknown;
  readonly updatedAt: number;
}): {
  readonly snapshots: SessionSnapshots;
  readonly snapshot: SessionSnapshot;
} => {
  const usageLimits = extractUsageLimits(payload.event);
  if (!usageLimits) {
    return { snapshots: payload.snapshots, snapshot: payload.snapshot };
  }

  if (areUsageLimitsEqual(payload.snapshot.status.usageLimits, usageLimits)) {
    return { snapshots: payload.snapshots, snapshot: payload.snapshot };
  }

  writeLastKnownUsageLimits(
    payload.snapshot.status.providerSummary,
    usageLimits
  );
  const providerKey = normalizeProviderKey(
    payload.snapshot.status.providerSummary
  );

  const nextSnapshots: SessionSnapshots = { ...payload.snapshots };
  let changed = false;

  for (const [sessionId, candidate] of Object.entries(payload.snapshots)) {
    if (
      sessionId !== payload.sessionId &&
      (!providerKey ||
        normalizeProviderKey(candidate.status.providerSummary) !== providerKey)
    ) {
      continue;
    }

    if (areUsageLimitsEqual(candidate.status.usageLimits, usageLimits)) {
      continue;
    }

    changed = true;
    nextSnapshots[sessionId] = {
      ...candidate,
      status: {
        ...candidate.status,
        usageLimits,
        updatedAt: payload.updatedAt,
      },
    };
  }

  if (!changed) {
    return { snapshots: payload.snapshots, snapshot: payload.snapshot };
  }

  return {
    snapshots: nextSnapshots,
    snapshot: nextSnapshots[payload.sessionId] ?? payload.snapshot,
  };
};

import type { SessionSnapshot } from "../../../../types/session";
import type { SessionSnapshots } from "../session/helpers";
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

type UsageLimitsSyncResult = {
  readonly snapshots: SessionSnapshots;
  readonly snapshot: SessionSnapshot;
};

type UsageLimitBucket = {
  readonly percentUsed: number;
  readonly resetsAt?: string | null;
};

type UsageLimitBucketKey =
  | "currentSession"
  | "currentWeekAllModels"
  | "currentWeekSonnetOnly";

type UsageLimits = Partial<
  Record<UsageLimitBucketKey, UsageLimitBucket | null>
>;

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

const normalizeProviderScopeKey = (value: string | null | undefined): string =>
  value?.trim().toLowerCase() ?? "";

const extractProviderScopeKey = (event: unknown): string => {
  if (!isRecord(event)) {
    return "";
  }

  const direct = readString(event.providerScopeKey);
  if (direct) {
    return normalizeProviderScopeKey(direct);
  }

  const data = isRecord(event.data) ? event.data : null;
  return normalizeProviderScopeKey(readString(data?.providerScopeKey));
};

const resolveSnapshotProviderScopeKey = (snapshot: SessionSnapshot): string =>
  normalizeProviderScopeKey(snapshot.status.providerScopeKey) ||
  normalizeProviderScopeKey(snapshot.status.providerSummary);

const resolveUsageLimitsProviderScopeKey = (
  snapshot: SessionSnapshot,
  event: unknown
): string =>
  extractProviderScopeKey(event) || resolveSnapshotProviderScopeKey(snapshot);

const hasMatchingUsageLimitsState = (
  snapshot: SessionSnapshot,
  usageLimits: UsageLimits,
  providerScopeKey: string
): boolean =>
  areUsageLimitsEqual(snapshot.status.usageLimits, usageLimits) &&
  normalizeProviderScopeKey(snapshot.status.providerScopeKey) ===
    providerScopeKey;

const shouldApplyUsageLimitsToCandidate = (params: {
  readonly sourceSessionId: string;
  readonly sessionId: string;
  readonly snapshot: SessionSnapshot;
  readonly usageLimits: UsageLimits;
  readonly providerScopeKey: string;
}): boolean => {
  if (
    params.sessionId !== params.sourceSessionId &&
    (!params.providerScopeKey ||
      resolveSnapshotProviderScopeKey(params.snapshot) !==
        params.providerScopeKey)
  ) {
    return false;
  }

  return !hasMatchingUsageLimitsState(
    params.snapshot,
    params.usageLimits,
    params.providerScopeKey
  );
};

const applyUsageLimitsToSnapshot = (params: {
  readonly snapshot: SessionSnapshot;
  readonly usageLimits: UsageLimits;
  readonly providerScopeKey: string;
  readonly updatedAt: number;
}): SessionSnapshot => ({
  ...params.snapshot,
  status: {
    ...params.snapshot.status,
    ...(params.providerScopeKey
      ? { providerScopeKey: params.providerScopeKey }
      : {}),
    usageLimits: params.usageLimits,
    updatedAt: params.updatedAt,
  },
});

export const applyUsageLimitsSyncFromStreamEvent = (payload: {
  readonly snapshots: SessionSnapshots;
  readonly sessionId: string;
  readonly snapshot: SessionSnapshot;
  readonly event?: unknown;
  readonly updatedAt: number;
}): UsageLimitsSyncResult => {
  const usageLimits = extractUsageLimits(payload.event);
  if (!usageLimits) {
    return { snapshots: payload.snapshots, snapshot: payload.snapshot };
  }

  const providerKey = resolveUsageLimitsProviderScopeKey(
    payload.snapshot,
    payload.event
  );
  if (hasMatchingUsageLimitsState(payload.snapshot, usageLimits, providerKey)) {
    return { snapshots: payload.snapshots, snapshot: payload.snapshot };
  }

  writeLastKnownUsageLimits(
    providerKey,
    usageLimits,
    payload.snapshot.status.providerSummary
  );

  const nextSnapshots: SessionSnapshots = { ...payload.snapshots };
  let changed = false;
  for (const [sessionId, candidate] of Object.entries(payload.snapshots)) {
    if (
      !shouldApplyUsageLimitsToCandidate({
        sourceSessionId: payload.sessionId,
        sessionId,
        snapshot: candidate,
        usageLimits,
        providerScopeKey: providerKey,
      })
    ) {
      continue;
    }

    changed = true;
    nextSnapshots[sessionId] = applyUsageLimitsToSnapshot({
      snapshot: candidate,
      usageLimits,
      providerScopeKey: providerKey,
      updatedAt: payload.updatedAt,
    });
  }

  if (!changed) {
    return { snapshots: payload.snapshots, snapshot: payload.snapshot };
  }

  return {
    snapshots: nextSnapshots,
    snapshot: nextSnapshots[payload.sessionId] ?? payload.snapshot,
  };
};

import type { SessionSnapshots } from "../../../ui/src/session/helpers";
import {
  areUsageLimitLabelsEqual,
  extractUsageLimitLabels,
} from "../../../ui/src/session/usage-limit-labels";
import { writeLastKnownUsageLimits } from "../../../ui/src/session/usage-limits-cache";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

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

type Bucket = {
  readonly percentUsed: number;
  readonly resetsAt?: string | null;
};

type UsageValue<T> = {
  readonly currentSession?: T | null;
  readonly currentWeekAllModels?: T | null;
  readonly currentWeekSonnetOnly?: T | null;
};

type UsageLimits = UsageValue<Bucket>;
type UsageLimitLabels = UsageValue<string>;

const areBucketsEqual = (
  left: Bucket | null | undefined,
  right: Bucket | null | undefined
): boolean =>
  left?.percentUsed === right?.percentUsed &&
  left?.resetsAt === right?.resetsAt;

const areUsageLimitsEqual = (
  left: UsageLimits | null | undefined,
  right: UsageLimits
): boolean =>
  Boolean(
    left &&
      areBucketsEqual(left.currentSession, right.currentSession) &&
      areBucketsEqual(left.currentWeekAllModels, right.currentWeekAllModels) &&
      areBucketsEqual(left.currentWeekSonnetOnly, right.currentWeekSonnetOnly)
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

const resolveProviderScopeKey = (
  snapshot: SessionSnapshots[string]
): string =>
  normalizeProviderScopeKey(snapshot.status.providerScopeKey) ||
  normalizeProviderScopeKey(snapshot.status.providerSummary);

const hasUsageLimits = (
  usageLimits: SessionSnapshots[string]["status"]["usageLimits"]
): usageLimits is NonNullable<SessionSnapshots[string]["status"]["usageLimits"]> =>
  Boolean(
    usageLimits &&
      (usageLimits.currentSession ||
        usageLimits.currentWeekAllModels ||
        usageLimits.currentWeekSonnetOnly)
  );

const clampPercent = (value: number): number => {
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
};

const readBucket = (value: unknown): Bucket | null => {
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

  const root = isRecord(event.usageLimits)
    ? event.usageLimits
    : isRecord(event.data)
      ? event.data
      : null;

  const fromData = isRecord(root) && isRecord(root.usageLimits)
    ? root.usageLimits
    : root;

  if (!isRecord(fromData)) {
    return null;
  }

  const currentSession = readBucket(fromData.currentSession);
  const currentWeekAllModels = readBucket(fromData.currentWeekAllModels);
  const currentWeekSonnetOnly = readBucket(fromData.currentWeekSonnetOnly);

  if (!(currentSession || currentWeekAllModels || currentWeekSonnetOnly)) {
    return null;
  }

  return {
    currentSession,
    currentWeekAllModels,
    currentWeekSonnetOnly,
  };
};

export const updateSnapshotsWithUsageLimits = (
  snapshots: SessionSnapshots,
  payload: { readonly sessionId: string; readonly event: unknown }
): SessionSnapshots => {
  const sourceSnapshot = snapshots[payload.sessionId];
  if (!sourceSnapshot) {
    return snapshots;
  }

  const usageLimits = extractUsageLimits(payload.event);
  if (!usageLimits) {
    return snapshots;
  }

  const sourceProviderKey =
    extractProviderScopeKey(payload.event) ||
    resolveProviderScopeKey(sourceSnapshot);
  const currentSourceProviderKey = normalizeProviderScopeKey(
    sourceSnapshot.status.providerScopeKey
  );
  const usageLimitLabels =
    extractUsageLimitLabels(payload.event) ??
    sourceSnapshot.status.usageLimitLabels ??
    null;
  if (
    areUsageLimitsEqual(sourceSnapshot.status.usageLimits, usageLimits) &&
    areUsageLimitLabelsEqual(sourceSnapshot.status.usageLimitLabels, usageLimitLabels) &&
    currentSourceProviderKey === sourceProviderKey
  ) {
    return snapshots;
  }

  writeLastKnownUsageLimits(
    sourceProviderKey,
    usageLimits,
    sourceSnapshot.status.providerSummary,
    usageLimitLabels
  );

  const now = Date.now();
  const nextSnapshots: SessionSnapshots = { ...snapshots };
  let changed = false;

  for (const [sessionId, snapshot] of Object.entries(snapshots)) {
    const currentProviderScopeKey = normalizeProviderScopeKey(
      snapshot.status.providerScopeKey
    );
    const sameProviderScope =
      sourceProviderKey.length > 0 &&
      resolveProviderScopeKey(snapshot) === sourceProviderKey;
    const shouldUpdateScopeKey =
      sourceProviderKey.length > 0 &&
      currentProviderScopeKey !== sourceProviderKey;
    if (!(sameProviderScope || sessionId === payload.sessionId)) {
      continue;
    }

    if (
      areUsageLimitsEqual(snapshot.status.usageLimits, usageLimits) &&
      areUsageLimitLabelsEqual(
        snapshot.status.usageLimitLabels,
        usageLimitLabels
      ) &&
      !shouldUpdateScopeKey
    ) {
      continue;
    }

    changed = true;
    nextSnapshots[sessionId] = {
      ...snapshot,
      status: {
        ...snapshot.status,
        ...(sourceProviderKey
          ? { providerScopeKey: sourceProviderKey }
          : {}),
        usageLimits,
        ...(usageLimitLabels ? { usageLimitLabels } : {}),
        updatedAt: now,
      },
    };
  }

  return changed ? nextSnapshots : snapshots;
};


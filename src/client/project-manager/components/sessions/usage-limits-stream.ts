import type { SessionSnapshots } from "../../../ui/src/session/helpers";
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

type UsageLimits = {
  readonly currentSession?: Bucket | null;
  readonly currentWeekAllModels?: Bucket | null;
  readonly currentWeekSonnetOnly?: Bucket | null;
};

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
  if (
    areUsageLimitsEqual(sourceSnapshot.status.usageLimits, usageLimits) &&
    currentSourceProviderKey === sourceProviderKey
  ) {
    return snapshots;
  }

  writeLastKnownUsageLimits(
    sourceProviderKey,
    usageLimits,
    sourceSnapshot.status.providerSummary
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
        updatedAt: now,
      },
    };
  }

  return changed ? nextSnapshots : snapshots;
};

export const resolveLatestUsageLimitsForProvider = (
  snapshots: SessionSnapshots,
  providerScopeKey: string
): SessionSnapshots[string]["status"]["usageLimits"] | null => {
  const providerKey = normalizeProviderScopeKey(providerScopeKey);
  if (!providerKey) {
    return null;
  }

  let latest:
    | {
        readonly usageLimits: NonNullable<
          SessionSnapshots[string]["status"]["usageLimits"]
        >;
        readonly updatedAt: number;
      }
    | null = null;

  for (const snapshot of Object.values(snapshots)) {
    if (resolveProviderScopeKey(snapshot) !== providerKey) {
      continue;
    }
    if (!hasUsageLimits(snapshot.status.usageLimits)) {
      continue;
    }
    const updatedAt = snapshot.status.updatedAt;
    if (!latest || updatedAt >= latest.updatedAt) {
      latest = {
        usageLimits: snapshot.status.usageLimits,
        updatedAt,
      };
    }
  }

  return latest?.usageLimits ?? null;
};

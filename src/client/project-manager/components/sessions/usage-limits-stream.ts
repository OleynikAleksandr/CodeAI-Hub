import type { SessionSnapshots } from "../../../ui/src/session/helpers";
import {
  areUsageLimitLabelsEqual,
  extractUsageLimitLabels,
} from "../../../ui/src/session/usage-limit-labels";

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
type CachedUsageTelemetry = {
  readonly providerScopeKey: string;
  readonly usageLimitLabels: UsageLimitLabels | null;
  readonly usageLimits: UsageLimits;
};

const providerUsageTelemetryCache = new Map<string, CachedUsageTelemetry>();

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

const buildGlobalProviderScopeKey = (providerFamily: string): string =>
  `${providerFamily}:global`;

const normalizeProviderFamily = (value: string | null | undefined): string => {
  const normalized = normalizeProviderScopeKey(value);
  if (!normalized) {
    return "";
  }
  const prefix = normalized.split(":")[0] ?? normalized;
  if (prefix.includes("claude")) {
    return "claude";
  }
  if (prefix.includes("codex")) {
    return "codex";
  }
  return prefix;
};

const extractProviderScopeKey = (event: unknown): string => {
  if (!isRecord(event)) {
    return "";
  }

  const directProviderFamily = normalizeProviderFamily(
    readString(event.providerScopeKey)
  );
  if (directProviderFamily) {
    return buildGlobalProviderScopeKey(directProviderFamily);
  }

  const data = isRecord(event.data) ? event.data : null;
  const dataProviderFamily = normalizeProviderFamily(
    readString(data?.providerScopeKey)
  );
  return dataProviderFamily
    ? buildGlobalProviderScopeKey(dataProviderFamily)
    : "";
};

const resolveProviderScopeKey = (
  snapshot: SessionSnapshots[string]
): string => {
  const providerFamily =
    normalizeProviderFamily(snapshot.status.providerScopeKey) ||
    normalizeProviderFamily(snapshot.status.models?.[0]?.providerId) ||
    normalizeProviderFamily(snapshot.status.providerSummary);
  return providerFamily ? buildGlobalProviderScopeKey(providerFamily) : "";
};

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

const cacheUsageTelemetry = (telemetry: CachedUsageTelemetry): void => {
  providerUsageTelemetryCache.set(telemetry.providerScopeKey, telemetry);
};

const resolveCachedUsageTelemetry = (
  snapshot: SessionSnapshots[string]
): CachedUsageTelemetry | null => {
  const providerScopeKey = resolveProviderScopeKey(snapshot);
  if (!providerScopeKey) {
    return null;
  }
  return providerUsageTelemetryCache.get(providerScopeKey) ?? null;
};

export const seedSnapshotWithCachedUsageLimits = (
  snapshot: SessionSnapshots[string]
): SessionSnapshots[string] => {
  const cachedTelemetry = resolveCachedUsageTelemetry(snapshot);
  if (!cachedTelemetry) {
    return snapshot;
  }

  const currentProviderScopeKey = normalizeProviderScopeKey(
    snapshot.status.providerScopeKey
  );
  const usageLimitLabels =
    cachedTelemetry.usageLimitLabels ?? snapshot.status.usageLimitLabels ?? null;
  if (
    areUsageLimitsEqual(snapshot.status.usageLimits, cachedTelemetry.usageLimits) &&
    areUsageLimitLabelsEqual(snapshot.status.usageLimitLabels, usageLimitLabels) &&
    currentProviderScopeKey === cachedTelemetry.providerScopeKey
  ) {
    return snapshot;
  }

  return {
    ...snapshot,
    status: {
      ...snapshot.status,
      providerScopeKey: cachedTelemetry.providerScopeKey,
      usageLimits: cachedTelemetry.usageLimits,
      ...(usageLimitLabels ? { usageLimitLabels } : {}),
    },
  };
};

export const resetProviderUsageTelemetryCacheForTests = (): void => {
  providerUsageTelemetryCache.clear();
};

export const updateSnapshotsWithUsageLimits = (
  snapshots: SessionSnapshots,
  payload: { readonly sessionId: string; readonly event: unknown }
): SessionSnapshots => {
  const usageLimits = extractUsageLimits(payload.event);
  if (!usageLimits) {
    return snapshots;
  }

  const sourceSnapshot = snapshots[payload.sessionId];
  const sourceProviderKey =
    extractProviderScopeKey(payload.event) ||
    (sourceSnapshot ? resolveProviderScopeKey(sourceSnapshot) : "");
  const usageLimitLabels =
    extractUsageLimitLabels(payload.event) ??
    sourceSnapshot?.status.usageLimitLabels ??
    null;
  if (sourceProviderKey) {
    cacheUsageTelemetry({
      providerScopeKey: sourceProviderKey,
      usageLimitLabels,
      usageLimits,
    });
  }
  const sourceProviderFamily = normalizeProviderFamily(sourceProviderKey);
  if (sourceSnapshot) {
    const currentSourceProviderKey = normalizeProviderScopeKey(
      sourceSnapshot.status.providerScopeKey
    );
    if (
      areUsageLimitsEqual(sourceSnapshot.status.usageLimits, usageLimits) &&
      areUsageLimitLabelsEqual(
        sourceSnapshot.status.usageLimitLabels,
        usageLimitLabels
      ) &&
      currentSourceProviderKey === sourceProviderKey
    ) {
      return snapshots;
    }
  }

  const now = Date.now();
  const nextSnapshots: SessionSnapshots = { ...snapshots };
  let changed = false;

  for (const [sessionId, snapshot] of Object.entries(snapshots)) {
    const currentProviderScopeKey = normalizeProviderScopeKey(
      snapshot.status.providerScopeKey
    );
    const currentProviderFamily =
      normalizeProviderFamily(currentProviderScopeKey) ||
      normalizeProviderFamily(snapshot.status.models?.[0]?.providerId) ||
      normalizeProviderFamily(snapshot.status.providerSummary);
    const sameProviderScope =
      sourceProviderFamily.length > 0 &&
      currentProviderFamily === sourceProviderFamily;
    const shouldUpdateScopeKey =
      sourceProviderKey.length > 0 &&
      currentProviderScopeKey !== sourceProviderKey;
    const isDirectSourceSession = sessionId === payload.sessionId;
    if (!(sameProviderScope || isDirectSourceSession)) {
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

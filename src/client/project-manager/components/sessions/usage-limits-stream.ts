import type { SessionSnapshots } from "../../../ui/src/session/helpers";

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

type Bucket = { readonly percentUsed: number; readonly resetsAt: string | null };

type UsageLimits = {
  readonly currentSession?: Bucket | null;
  readonly currentWeekAllModels?: Bucket | null;
  readonly currentWeekSonnetOnly?: Bucket | null;
};

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

  const fromData =
    root && isRecord(root) && root.kind === "usage_limits" && isRecord(root.usageLimits)
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
  const snapshot = snapshots[payload.sessionId];
  if (!snapshot) {
    return snapshots;
  }

  const usageLimits = extractUsageLimits(payload.event);
  if (!usageLimits) {
    return snapshots;
  }

  return {
    ...snapshots,
    [payload.sessionId]: {
      ...snapshot,
      status: {
        ...snapshot.status,
        usageLimits,
        updatedAt: Date.now(),
      },
    },
  };
};

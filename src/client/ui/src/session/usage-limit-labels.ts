import type { SessionUsageLimitLabels } from "../../../../types/session";

type UsageLimitLabels = NonNullable<SessionUsageLimitLabels>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export const extractUsageLimitLabels = (
  event: unknown
): UsageLimitLabels | null => {
  if (!isRecord(event)) {
    return null;
  }

  const data = isRecord(event.data) ? event.data : null;
  const candidate = isRecord(data?.usageLimitLabels)
    ? data.usageLimitLabels
    : null;
  if (!isRecord(candidate)) {
    return null;
  }

  const labels: UsageLimitLabels = {
    currentSession: readString(candidate.currentSession),
    currentWeekAllModels: readString(candidate.currentWeekAllModels),
    currentWeekSonnetOnly: readString(candidate.currentWeekSonnetOnly),
  };
  return Object.values(labels).some((value) => Boolean(value)) ? labels : null;
};

export const areUsageLimitLabelsEqual = (
  left: SessionUsageLimitLabels | null | undefined,
  right: SessionUsageLimitLabels | null | undefined
): boolean =>
  left?.currentSession === right?.currentSession &&
  left?.currentWeekAllModels === right?.currentWeekAllModels &&
  left?.currentWeekSonnetOnly === right?.currentWeekSonnetOnly;

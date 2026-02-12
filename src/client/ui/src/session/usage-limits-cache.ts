import type { SessionStatusInfo } from "../../../../types/session";

type UsageLimits = NonNullable<SessionStatusInfo["usageLimits"]>;

type StoredUsageLimits = {
  readonly usageLimits: UsageLimits;
  readonly updatedAt: number;
};

const USAGE_LIMITS_STORAGE_PREFIX = "codeaihub:lastUsageLimitsByProvider:";

const getLocalStorage = (): Storage | null => {
  try {
    return "localStorage" in globalThis ? globalThis.localStorage : null;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeProviderKey = (value: string): string =>
  value.trim().toLowerCase();

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const parseBucket = (
  value: unknown
): UsageLimits["currentSession"] | UsageLimits["currentWeekAllModels"] => {
  if (!isRecord(value)) {
    return null;
  }
  const percentUsed = readNumber(value.percentUsed);
  if (percentUsed === null) {
    return null;
  }
  return {
    percentUsed,
    resetsAt: readString(value.resetsAt),
  };
};

const parseUsageLimits = (value: unknown): UsageLimits | null => {
  if (!isRecord(value)) {
    return null;
  }
  const parsed: UsageLimits = {
    currentSession: parseBucket(value.currentSession),
    currentWeekAllModels: parseBucket(value.currentWeekAllModels),
    currentWeekSonnetOnly: parseBucket(value.currentWeekSonnetOnly),
  };
  if (
    !(
      parsed.currentSession ||
      parsed.currentWeekAllModels ||
      parsed.currentWeekSonnetOnly
    )
  ) {
    return null;
  }
  return parsed;
};

const parseStoredUsageLimits = (raw: string): StoredUsageLimits | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const usageLimits = parseUsageLimits(parsed.usageLimits);
  const updatedAt = readNumber(parsed.updatedAt);
  if (!usageLimits || updatedAt === null || updatedAt <= 0) {
    return null;
  }
  return { usageLimits, updatedAt };
};

export const readLastKnownUsageLimits = (
  providerSummary: string
): UsageLimits | null => {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }
  const providerKey = normalizeProviderKey(providerSummary);
  if (!providerKey) {
    return null;
  }
  const raw = storage.getItem(`${USAGE_LIMITS_STORAGE_PREFIX}${providerKey}`);
  if (!raw) {
    return null;
  }
  const stored = parseStoredUsageLimits(raw);
  return stored?.usageLimits ?? null;
};

export const writeLastKnownUsageLimits = (
  providerSummary: string,
  usageLimits: SessionStatusInfo["usageLimits"]
): void => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  const providerKey = normalizeProviderKey(providerSummary);
  if (!providerKey) {
    return;
  }
  const parsed = parseUsageLimits(usageLimits);
  if (!parsed) {
    return;
  }
  try {
    storage.setItem(
      `${USAGE_LIMITS_STORAGE_PREFIX}${providerKey}`,
      JSON.stringify({
        usageLimits: parsed,
        updatedAt: Date.now(),
      } satisfies StoredUsageLimits)
    );
  } catch {
    // ignore quota / permission errors
  }
};

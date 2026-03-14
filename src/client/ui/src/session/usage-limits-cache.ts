import type { SessionStatusInfo } from "../../../../types/session";

type UsageLimits = NonNullable<SessionStatusInfo["usageLimits"]>;
type UsageLimitLabels = SessionStatusInfo["usageLimitLabels"];

type StoredUsageLimits = {
  readonly usageLimits: UsageLimits;
  readonly usageLimitLabels?: UsageLimitLabels;
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

const normalizeStorageKey = (value: string | null | undefined): string =>
  value?.trim().toLowerCase() ?? "";

const resolveStorageKeys = (
  providerScopeKey: string | null | undefined,
  legacyProviderSummary?: string | null
): readonly string[] => {
  const keys: string[] = [];
  for (const candidate of [providerScopeKey, legacyProviderSummary]) {
    const normalized = normalizeStorageKey(candidate);
    if (normalized && !keys.includes(normalized)) {
      keys.push(normalized);
    }
  }
  return keys;
};

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const parseLabels = (value: unknown): UsageLimitLabels => {
  if (!isRecord(value)) {
    return null;
  }

  const labels: NonNullable<UsageLimitLabels> = {
    currentSession: readString(value.currentSession),
    currentWeekAllModels: readString(value.currentWeekAllModels),
    currentWeekSonnetOnly: readString(value.currentWeekSonnetOnly),
  };
  return Object.values(labels).some((label) => Boolean(label)) ? labels : null;
};

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
  const usageLimitLabels = parseLabels(parsed.usageLimitLabels);
  const updatedAt = readNumber(parsed.updatedAt);
  if (!usageLimits || updatedAt === null || updatedAt <= 0) {
    return null;
  }
  return {
    usageLimits,
    ...(usageLimitLabels ? { usageLimitLabels } : {}),
    updatedAt,
  };
};

export const readLastKnownUsageLimitsState = (
  providerScopeKey: string | null | undefined,
  legacyProviderSummary?: string | null
): StoredUsageLimits | null => {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  for (const providerKey of resolveStorageKeys(
    providerScopeKey,
    legacyProviderSummary
  )) {
    const raw = storage.getItem(`${USAGE_LIMITS_STORAGE_PREFIX}${providerKey}`);
    if (!raw) {
      continue;
    }
    const stored = parseStoredUsageLimits(raw);
    if (stored?.usageLimits) {
      return stored;
    }
  }

  return null;
};

export const readLastKnownUsageLimits = (
  providerScopeKey: string | null | undefined,
  legacyProviderSummary?: string | null
): UsageLimits | null =>
  readLastKnownUsageLimitsState(providerScopeKey, legacyProviderSummary)
    ?.usageLimits ?? null;

export const writeLastKnownUsageLimits = (
  providerScopeKey: string | null | undefined,
  usageLimits: SessionStatusInfo["usageLimits"],
  legacyProviderSummary?: string | null,
  usageLimitLabels?: SessionStatusInfo["usageLimitLabels"]
): void => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  const providerKey = resolveStorageKeys(
    providerScopeKey,
    legacyProviderSummary
  )[0];
  if (!providerKey) {
    return;
  }
  const parsed = parseUsageLimits(usageLimits);
  if (!parsed) {
    return;
  }
  try {
    const parsedLabels = parseLabels(usageLimitLabels);
    storage.setItem(
      `${USAGE_LIMITS_STORAGE_PREFIX}${providerKey}`,
      JSON.stringify({
        usageLimits: parsed,
        ...(parsedLabels ? { usageLimitLabels: parsedLabels } : {}),
        updatedAt: Date.now(),
      } satisfies StoredUsageLimits)
    );
  } catch {
    // ignore quota / permission errors
  }
};

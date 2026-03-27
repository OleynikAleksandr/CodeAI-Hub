interface TokenUsageSnapshot {
  readonly limit: number;
  readonly used: number;
}

type StoredTokenUsageSnapshot = TokenUsageSnapshot & {
  readonly updatedAt: number;
};

const TOKEN_USAGE_STORAGE_PREFIX = "codeaihub:lastTokenUsage:";

const getLocalStorage = (): Storage | null => {
  try {
    return "localStorage" in globalThis ? globalThis.localStorage : null;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const parseStoredTokenUsage = (
  raw: string
): StoredTokenUsageSnapshot | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const used = readNumber(parsed.used);
  const limit = readNumber(parsed.limit);
  const updatedAt = readNumber(parsed.updatedAt);
  if (used === null || limit === null || updatedAt === null) {
    return null;
  }
  if (used < 0 || limit <= 0 || updatedAt <= 0) {
    return null;
  }
  return { used, limit, updatedAt };
};

export const readLastKnownTokenUsage = (
  providerSessionId: string
): TokenUsageSnapshot | null => {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }
  const key = `${TOKEN_USAGE_STORAGE_PREFIX}${providerSessionId}`;
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }
  const stored = parseStoredTokenUsage(raw);
  return stored ? { used: stored.used, limit: stored.limit } : null;
};

export const writeLastKnownTokenUsage = (
  providerSessionId: string,
  tokenUsage: TokenUsageSnapshot
): void => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  if (
    !(Number.isFinite(tokenUsage.used) && Number.isFinite(tokenUsage.limit))
  ) {
    return;
  }
  if (tokenUsage.used < 0 || tokenUsage.limit <= 0) {
    return;
  }

  const key = `${TOKEN_USAGE_STORAGE_PREFIX}${providerSessionId}`;
  const payload: StoredTokenUsageSnapshot = {
    used: tokenUsage.used,
    limit: tokenUsage.limit,
    updatedAt: Date.now(),
  };
  try {
    storage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore quota / permission errors
  }
};

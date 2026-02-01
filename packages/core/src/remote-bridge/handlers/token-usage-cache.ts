import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type TokenUsageSnapshot = {
  readonly used: number;
  readonly limit: number;
  readonly updatedAt: string;
};

export type CoreStateSessionEntry = {
  readonly id: string;
  readonly providerSessionId: string | null;
};

const TOKEN_USAGE_CACHE_DIR = path.join(homedir(), ".codeai-hub", "state");
const TOKEN_USAGE_CACHE_FILE = path.join(
  TOKEN_USAGE_CACHE_DIR,
  "token-usage-cache.json"
);
const TOKEN_USAGE_CACHE_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const parseStoredTokenUsageSnapshot = (
  value: unknown
): TokenUsageSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }
  const used = readNumber(value.used);
  const limit = readNumber(value.limit);
  const updatedAt = readString(value.updatedAt);
  if (used === null || limit === null || updatedAt === null) {
    return null;
  }
  if (used < 0 || limit <= 0) {
    return null;
  }
  return { used, limit, updatedAt };
};

export const loadTokenUsageCache = (): Map<string, TokenUsageSnapshot> => {
  try {
    const raw = readFileSync(TOKEN_USAGE_CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return new Map();
    }
    if (readNumber(parsed.version) !== TOKEN_USAGE_CACHE_VERSION) {
      return new Map();
    }
    if (!isRecord(parsed.byProviderSessionId)) {
      return new Map();
    }
    const result = new Map<string, TokenUsageSnapshot>();
    for (const [key, entry] of Object.entries(parsed.byProviderSessionId)) {
      const providerSessionId = readString(key);
      if (!providerSessionId) {
        continue;
      }
      const snapshot = parseStoredTokenUsageSnapshot(entry);
      if (!snapshot) {
        continue;
      }
      result.set(providerSessionId, snapshot);
    }
    return result;
  } catch {
    return new Map();
  }
};

export const persistTokenUsageCache = (
  payload: Map<string, TokenUsageSnapshot>
): void => {
  try {
    mkdirSync(TOKEN_USAGE_CACHE_DIR, { recursive: true });
    const tmpPath = `${TOKEN_USAGE_CACHE_FILE}.tmp`;
    const byProviderSessionId: Record<string, TokenUsageSnapshot> = {};
    for (const [providerSessionId, snapshot] of payload) {
      byProviderSessionId[providerSessionId] = snapshot;
    }
    const content = JSON.stringify(
      {
        version: TOKEN_USAGE_CACHE_VERSION,
        updatedAt: new Date().toISOString(),
        byProviderSessionId,
      },
      null,
      2
    );
    writeFileSync(tmpPath, content, "utf8");
    renameSync(tmpPath, TOKEN_USAGE_CACHE_FILE);
  } catch {
    // ignore persistence failures
  }
};

export const extractProviderSessionIdFromStreamEvent = (
  event: unknown
): string | null => {
  if (!isRecord(event)) {
    return null;
  }
  return (
    readString(event.providerSessionId) ??
    readString(event.claudeSessionId) ??
    null
  );
};

export const extractSessionsFromInitialState = (
  payload: unknown
): readonly CoreStateSessionEntry[] => {
  if (!isRecord(payload)) {
    return [];
  }
  const sessions = payload.sessions;
  if (!Array.isArray(sessions)) {
    return [];
  }

  const out: CoreStateSessionEntry[] = [];
  for (const entry of sessions) {
    if (!isRecord(entry)) {
      continue;
    }
    const id = readString(entry.id);
    if (!id) {
      continue;
    }
    const providerSessionId = readString(entry.providerSessionId);
    out.push({ id, providerSessionId });
  }
  return out;
};

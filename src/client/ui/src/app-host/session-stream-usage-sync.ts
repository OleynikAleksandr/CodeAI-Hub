import type { SessionSnapshot } from "../../../../types/session";
import type { SessionSnapshots } from "../session/helpers";
import { writeLastKnownTokenUsage } from "../session/token-usage-cache";

export { applyUsageLimitsSyncFromStreamEvent } from "./session-stream-usage-limits-sync";

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

interface TokenUsage {
  readonly limit: number;
  readonly used: number;
}

interface ExtractedTokenUsage {
  readonly threadId: string | null;
  readonly tokenUsage: TokenUsage;
}

interface UsageSyncResult {
  readonly snapshot: SessionSnapshot;
  readonly snapshots: SessionSnapshots;
}

const readTokenUsage = (value: unknown): TokenUsage | null => {
  if (!isRecord(value)) {
    return null;
  }
  const used = readNumber(value.used);
  const limit = readNumber(value.limit);
  if (used === null || limit === null) {
    return null;
  }
  if (used < 0 || limit <= 0) {
    return null;
  }
  return { used: Math.round(used), limit: Math.round(limit) };
};

const extractTokenUsage = (event: unknown): ExtractedTokenUsage | null => {
  if (!isRecord(event)) {
    return null;
  }

  const direct = readTokenUsage(event.tokenUsage);
  if (direct) {
    return { tokenUsage: direct, threadId: readString(event.threadId) };
  }

  const data = isRecord(event.data) ? event.data : null;
  if (!data || data.kind !== "token_usage") {
    return null;
  }

  const tokenUsage = readTokenUsage(data);
  if (!tokenUsage) {
    return null;
  }

  return { tokenUsage, threadId: readString(event.threadId) };
};

export const applyTokenUsageSyncFromStreamEvent = (payload: {
  readonly snapshots: SessionSnapshots;
  readonly sessionId: string;
  readonly snapshot: SessionSnapshot;
  readonly event?: unknown;
  readonly updatedAt: number;
}): UsageSyncResult => {
  const tokenUsagePayload = extractTokenUsage(payload.event);
  if (!tokenUsagePayload) {
    return { snapshots: payload.snapshots, snapshot: payload.snapshot };
  }

  const currentTokenUsage = payload.snapshot.status.tokenUsage;
  if (
    currentTokenUsage.used === tokenUsagePayload.tokenUsage.used &&
    currentTokenUsage.limit === tokenUsagePayload.tokenUsage.limit
  ) {
    return { snapshots: payload.snapshots, snapshot: payload.snapshot };
  }

  const providerSessionId =
    payload.snapshot.binding.providerSessionId ?? tokenUsagePayload.threadId;
  if (providerSessionId) {
    writeLastKnownTokenUsage(providerSessionId, tokenUsagePayload.tokenUsage);
  }

  const nextSnapshot: SessionSnapshot = {
    ...payload.snapshot,
    status: {
      ...payload.snapshot.status,
      tokenUsage: tokenUsagePayload.tokenUsage,
      updatedAt: payload.updatedAt,
    },
  };

  return {
    snapshots: { ...payload.snapshots, [payload.sessionId]: nextSnapshot },
    snapshot: nextSnapshot,
  };
};

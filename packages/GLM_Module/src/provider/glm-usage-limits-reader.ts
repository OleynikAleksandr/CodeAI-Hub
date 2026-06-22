// Reads GLM plan usage limits (5h session + weekly) from the Z.AI monitor
// endpoint and shapes them into the stream payload the session UI consumes.
// This is independent of the per-turn context-window token usage; it is a
// separate HTTP GET against the provider account quota.

const GLM_USAGE_SCOPE_KEY = "glmNative:global";
const MONITOR_PATH = "/api/monitor/usage/quota/limit";
const SESSION_UNIT = 3;
const WEEKLY_UNIT = 6;

interface GlmUsageBucket {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
}

interface GlmUsageLimitsValue {
  readonly currentSession: GlmUsageBucket | null;
  readonly currentWeekAllModels: GlmUsageBucket | null;
}

export interface GlmUsageLimitsPayload {
  readonly data: {
    readonly collectedAt: string;
    readonly kind: "usage_limits";
    readonly providerScopeKey: string;
    readonly source: "glm_monitor";
    readonly usageLimitLabels: {
      readonly currentSession: string;
      readonly currentWeekAllModels: string;
    };
    readonly usageLimits: GlmUsageLimitsValue;
  };
  readonly providerScopeKey: string;
  readonly usageLimits: GlmUsageLimitsValue;
}

export interface ReadGlmUsageLimitsInput {
  readonly apiKey: string | null;
  readonly baseUrl: string;
}

type RawLimit = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

// The monitor quota lives on the same host as the coding API but a different
// path, so derive the origin from baseUrl (also supports the CN host).
const resolveMonitorUrl = (baseUrl: string): string | null => {
  try {
    return `${new URL(baseUrl).origin}${MONITOR_PATH}`;
  } catch {
    return null;
  }
};

const toBucket = (raw: RawLimit): GlmUsageBucket | null => {
  const percentUsed = readNumber(raw.percentage);
  if (percentUsed === null) {
    return null;
  }
  const resetMs = readNumber(raw.nextResetTime);
  return {
    percentUsed,
    resetsAt: resetMs === null ? null : new Date(resetMs).toISOString(),
  };
};

const pickTokenLimits = (data: unknown): RawLimit[] => {
  const limits =
    isRecord(data) && Array.isArray(data.limits) ? data.limits : [];
  return limits.filter(
    (limit): limit is RawLimit =>
      isRecord(limit) && limit.type === "TOKENS_LIMIT"
  );
};

// Classify by (type, unit), never by array position — the bucket order is not
// stable. TIME_LIMIT (monthly MCP ceiling) is excluded upstream by the filter.
const classifyBuckets = (
  tokenLimits: readonly RawLimit[]
): { readonly session: RawLimit | null; readonly weekly: RawLimit | null } => {
  const session =
    tokenLimits.find((limit) => readNumber(limit.unit) === SESSION_UNIT) ??
    null;
  const weekly =
    tokenLimits.find((limit) => readNumber(limit.unit) === WEEKLY_UNIT) ?? null;
  if (session || weekly) {
    return { session, weekly };
  }
  // Fallback when unit codes drift: nearest reset is the 5h window, farthest
  // is the weekly window.
  const sorted = [...tokenLimits].sort(
    (left, right) =>
      (readNumber(left.nextResetTime) ?? 0) -
      (readNumber(right.nextResetTime) ?? 0)
  );
  return {
    session: sorted[0] ?? null,
    weekly: sorted.length > 1 ? (sorted.at(-1) ?? null) : null,
  };
};

export const readGlmUsageLimits = async (
  input: ReadGlmUsageLimitsInput
): Promise<GlmUsageLimitsPayload | null> => {
  if (!input.apiKey) {
    return null;
  }
  const monitorUrl = resolveMonitorUrl(input.baseUrl);
  if (!monitorUrl) {
    return null;
  }
  const response = await fetch(monitorUrl, {
    headers: { Authorization: input.apiKey }, // bare key, NO "Bearer" prefix
    method: "GET",
  }).catch(() => null);
  if (!response?.ok) {
    return null;
  }
  const body = (await response.json().catch(() => null)) as unknown;
  const data = isRecord(body) ? body.data : null;
  const { session, weekly } = classifyBuckets(pickTokenLimits(data));
  const currentSession = session ? toBucket(session) : null;
  const currentWeekAllModels = weekly ? toBucket(weekly) : null;
  if (!(currentSession || currentWeekAllModels)) {
    return null;
  }
  const usageLimits: GlmUsageLimitsValue = {
    currentSession,
    currentWeekAllModels,
  };
  return {
    providerScopeKey: GLM_USAGE_SCOPE_KEY,
    usageLimits,
    data: {
      collectedAt: new Date().toISOString(),
      kind: "usage_limits",
      providerScopeKey: GLM_USAGE_SCOPE_KEY,
      source: "glm_monitor",
      usageLimitLabels: {
        currentSession: "5h",
        currentWeekAllModels: "Weekly",
      },
      usageLimits,
    },
  };
};

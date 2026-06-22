import { readFile } from "node:fs/promises";

const KIMI_USAGE_ENDPOINT = "https://api.kimi.com/coding/v1/usages";
const KIMI_SCOPE_KEY = "kimi:global";
const KIMI_SOURCE = "kimi_usage_api";
const PROVIDER_SECTION = "providers.kimi-for-coding";
const COMMENT_PATTERN = /#.*$/u;
const LINE_SPLIT_PATTERN = /\r?\n/u;
const SECTION_PATTERN = /^\[([^\]]+)\]$/u;
const API_KEY_PATTERN = /^api_key\s*=\s*(.+)$/u;
const FRACTIONAL_SECONDS_PATTERN = /\.(\d{3})\d+(Z)$/u;

interface KimiFetchResponse {
  json(): Promise<unknown>;
  readonly ok: boolean;
  readonly status: number;
}

type KimiFetch = (
  url: string,
  init: {
    readonly headers: Record<string, string>;
    readonly method: "GET";
  }
) => Promise<KimiFetchResponse>;

interface UsageBucket {
  readonly limit?: unknown;
  readonly remaining?: unknown;
  readonly resetTime?: unknown;
  readonly used?: unknown;
}

export interface KimiUsageLimitBucket {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
}

export interface KimiUsageLimitsPayload {
  readonly data: {
    readonly collectedAt: string;
    readonly diagnostics: {
      readonly force: boolean;
      readonly fromCache: boolean;
      readonly readerRegistered: true;
      readonly result: "fresh_read";
      readonly source: typeof KIMI_SOURCE;
    };
    readonly kind: "usage_limits";
    readonly providerScopeKey: typeof KIMI_SCOPE_KEY;
    readonly source: typeof KIMI_SOURCE;
    readonly usageLimitLabels: {
      readonly currentSession: "5h";
      readonly currentWeekAllModels: "Weekly";
    };
    readonly usageLimits: {
      readonly currentSession: KimiUsageLimitBucket | null;
      readonly currentWeekAllModels: KimiUsageLimitBucket | null;
      readonly currentWeekSonnetOnly: null;
    };
  };
  readonly providerScopeKey: typeof KIMI_SCOPE_KEY;
  readonly usageLimits: KimiUsageLimitsPayload["data"]["usageLimits"];
}

export interface KimiUsageLimitsReaderOptions {
  readonly clock?: () => Date;
  readonly endpoint?: string;
  readonly fetch?: KimiFetch;
}

export interface KimiUsageLimitsReadParams {
  readonly force?: boolean;
  readonly userConfigPath: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Number.parseFloat(value.trim().replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return Math.round(value);
};

const normalizeResetTime = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.replace(FRACTIONAL_SECONDS_PATTERN, ".$1$2");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
};

const buildBucket = (
  bucket: UsageBucket | null
): KimiUsageLimitBucket | null => {
  if (!bucket) {
    return null;
  }
  const limit = readNumber(bucket.limit);
  const remaining = readNumber(bucket.remaining);
  // The 5h window (limits[].detail) reports `remaining`, not `used`, so derive
  // used from limit - remaining when the bucket has no explicit `used`.
  const used =
    readNumber(bucket.used) ??
    (limit !== null && remaining !== null ? limit - remaining : null);
  if (used === null) {
    return null;
  }
  const percentUsed = limit !== null && limit > 0 ? (used / limit) * 100 : used;
  return {
    percentUsed: clampPercent(percentUsed),
    resetsAt: normalizeResetTime(bucket.resetTime),
  };
};

const readBucket = (value: unknown): UsageBucket | null =>
  isRecord(value)
    ? {
        limit: value.limit,
        remaining: value.remaining,
        resetTime: value.resetTime,
        used: value.used,
      }
    : null;

const readFiveHourBucket = (
  payload: Record<string, unknown>
): UsageBucket | null => {
  const limits = Array.isArray(payload.limits) ? payload.limits : [];
  const firstLimit = limits.find((candidate) => isRecord(candidate));
  if (!isRecord(firstLimit)) {
    return null;
  }
  return readBucket(firstLimit.detail);
};

const unquoteTomlValue = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

export const extractKimiApiKeyFromConfig = (
  configText: string
): string | null => {
  let activeSection: string | null = null;
  for (const rawLine of configText.split(LINE_SPLIT_PATTERN)) {
    const line = rawLine.replace(COMMENT_PATTERN, "").trim();
    if (!line) {
      continue;
    }
    const sectionMatch = line.match(SECTION_PATTERN);
    if (sectionMatch) {
      activeSection = sectionMatch[1]?.trim() ?? null;
      continue;
    }
    if (activeSection !== PROVIDER_SECTION) {
      continue;
    }
    const keyMatch = line.match(API_KEY_PATTERN);
    if (!keyMatch?.[1]) {
      continue;
    }
    const apiKey = unquoteTomlValue(keyMatch[1]).trim();
    return apiKey.length > 0 ? apiKey : null;
  }
  return null;
};

const defaultFetch: KimiFetch = async (url, init) => {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is unavailable.");
  }
  return await fetch(url, init);
};

export class KimiUsageLimitsReader {
  readonly #clock: () => Date;
  readonly #endpoint: string;
  readonly #fetch: KimiFetch;

  constructor(options: KimiUsageLimitsReaderOptions = {}) {
    this.#clock = options.clock ?? (() => new Date());
    this.#endpoint = options.endpoint ?? KIMI_USAGE_ENDPOINT;
    this.#fetch = options.fetch ?? defaultFetch;
  }

  async read(
    params: KimiUsageLimitsReadParams
  ): Promise<KimiUsageLimitsPayload | null> {
    const apiKey = extractKimiApiKeyFromConfig(
      await readFile(params.userConfigPath, "utf8").catch(() => "")
    );
    if (!apiKey) {
      return null;
    }

    const response = await this.#fetch(this.#endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      method: "GET",
    }).catch(() => null);
    if (!response?.ok) {
      return null;
    }

    const payload = await response.json().catch(() => null);
    return this.#buildPayload(payload, Boolean(params.force));
  }

  #buildPayload(
    payload: unknown,
    force: boolean
  ): KimiUsageLimitsPayload | null {
    if (!isRecord(payload)) {
      return null;
    }
    const currentSession = buildBucket(readFiveHourBucket(payload));
    const currentWeekAllModels = buildBucket(readBucket(payload.usage));
    if (!(currentSession || currentWeekAllModels)) {
      return null;
    }
    const usageLimits = {
      currentSession,
      currentWeekAllModels,
      currentWeekSonnetOnly: null,
    };

    return {
      providerScopeKey: KIMI_SCOPE_KEY,
      usageLimits,
      data: {
        collectedAt: this.#clock().toISOString(),
        diagnostics: {
          force,
          fromCache: false,
          readerRegistered: true,
          result: "fresh_read",
          source: KIMI_SOURCE,
        },
        kind: "usage_limits",
        providerScopeKey: KIMI_SCOPE_KEY,
        source: KIMI_SOURCE,
        usageLimitLabels: {
          currentSession: "5h",
          currentWeekAllModels: "Weekly",
        },
        usageLimits,
      },
    };
  }
}

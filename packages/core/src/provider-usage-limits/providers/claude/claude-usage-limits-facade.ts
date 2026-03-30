import { buildProviderUsageLimitScopeKey } from "../../provider-usage-limits-scope-key";
import { buildProviderUsageLimitsStreamPayload } from "../../provider-usage-limits-stream-event";
import type {
  CompatibleSessionUsageLimits,
  ProviderUsageLimitBucket,
  ProviderUsageLimitSource,
  ProviderUsageLimitsSnapshot,
  ProviderUsageLimitsStreamPayload,
  ProviderUsageLimitWindow,
  ReadProviderUsageLimitsParams,
} from "../../provider-usage-limits-types";
import {
  ClaudeLiveHeadersReader,
  type ClaudeLiveHeadersSnapshot,
  type ClaudeOAuthTokenResolver,
} from "./claude-live-headers-reader";
import { ClaudeUsageLimitsNormalizer } from "./claude-usage-limits-normalizer";
import { resolveClaudeUsageOAuthToken } from "./claude-usage-token-resolver";

type ClaudeUsageLimitSource = Extract<
  ProviderUsageLimitSource,
  "claude_headers" | "claude_probe"
>;
type ClaudeRuntimeRateLimitType =
  | "five_hour"
  | "seven_day"
  | "seven_day_sonnet";

export interface ClaudeUsageLimitsFacadeOptions {
  readonly headersReader?: ClaudeLiveHeadersReader;
  readonly normalizer?: ClaudeUsageLimitsNormalizer;
  readonly oauthTokenResolver?: ClaudeOAuthTokenResolver;
}

export interface ClaudeUsageHeadersInput {
  readonly collectedAt?: string;
  readonly headers: ReadonlyMap<string, string>;
  readonly providerSessionId: string | null;
  readonly source?: ClaudeUsageLimitSource;
}
export interface ClaudeRuntimeRateLimitPayload {
  readonly collectedAt?: string;
  readonly rate_limit_info?: unknown;
  readonly rateLimitInfo?: unknown;
}

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

const normalizeRuntimeResetsAt = (value: unknown): string | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const timestampMs = value >= 1_000_000_000_000 ? value : value * 1000;
  const parsedDate = new Date(timestampMs);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
};

const normalizeRuntimeBucket = (
  value: unknown
): {
  readonly bucket: ProviderUsageLimitBucket;
  readonly rateLimitType: ClaudeRuntimeRateLimitType;
} | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const rateLimitType = record.rateLimitType;
  if (
    rateLimitType !== "five_hour" &&
    rateLimitType !== "seven_day" &&
    rateLimitType !== "seven_day_sonnet"
  ) {
    return null;
  }

  let utilization: number | null = null;
  if (
    typeof record.utilization === "number" &&
    Number.isFinite(record.utilization)
  ) {
    utilization =
      record.utilization <= 1 ? record.utilization * 100 : record.utilization;
  } else if (record.status === "rejected") {
    utilization = 100;
  }
  if (utilization === null) {
    return null;
  }

  return {
    bucket: {
      percentUsed: clampPercent(utilization),
      resetsAt: normalizeRuntimeResetsAt(record.resetsAt),
    },
    rateLimitType,
  };
};

export class ClaudeUsageLimitsFacade {
  readonly #headersReader: ClaudeLiveHeadersReader;
  readonly #normalizer: ClaudeUsageLimitsNormalizer;

  constructor(options: ClaudeUsageLimitsFacadeOptions = {}) {
    this.#headersReader =
      options.headersReader ??
      new ClaudeLiveHeadersReader({
        resolveOAuthToken:
          options.oauthTokenResolver ?? resolveClaudeUsageOAuthToken,
      });
    this.#normalizer = options.normalizer ?? new ClaudeUsageLimitsNormalizer();
  }

  async read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null> {
    if (params.providerId !== "claude") {
      return null;
    }

    const headerSnapshot = await this.#headersReader.read(params);
    return headerSnapshot
      ? this.#normalizeSnapshot(params.providerSessionId, headerSnapshot)
      : null;
  }

  normalizeHeaders(
    input: ClaudeUsageHeadersInput
  ): ProviderUsageLimitsSnapshot | null {
    return this.#normalizer.normalize({
      collectedAt: input.collectedAt,
      headers: input.headers,
      providerScopeKey: this.#buildScopeKey(input.providerSessionId),
      source: input.source ?? "claude_headers",
    });
  }

  readStreamPayloadFromRuntimeRateLimit(input: {
    readonly previousUsageLimits?: CompatibleSessionUsageLimits;
    readonly providerSessionId: string | null;
    readonly runtimePayload: ClaudeRuntimeRateLimitPayload;
  }): ProviderUsageLimitsStreamPayload | null {
    const runtimeBucket = normalizeRuntimeBucket(
      input.runtimePayload.rateLimitInfo ?? input.runtimePayload.rate_limit_info
    );
    if (!runtimeBucket) {
      return null;
    }

    const usageLimits = {
      currentSession: input.previousUsageLimits?.currentSession ?? null,
      currentWeekAllModels:
        input.previousUsageLimits?.currentWeekAllModels ?? null,
      currentWeekSonnetOnly:
        input.previousUsageLimits?.currentWeekSonnetOnly ?? null,
    };

    if (runtimeBucket.rateLimitType === "five_hour") {
      usageLimits.currentSession = runtimeBucket.bucket;
    }
    if (runtimeBucket.rateLimitType === "seven_day") {
      usageLimits.currentWeekAllModels = runtimeBucket.bucket;
    }
    if (runtimeBucket.rateLimitType === "seven_day_sonnet") {
      usageLimits.currentWeekSonnetOnly = runtimeBucket.bucket;
    }

    const snapshot = this.#buildRuntimeSnapshot(
      input.providerSessionId,
      usageLimits,
      input.runtimePayload.collectedAt
    );
    return snapshot
      ? buildProviderUsageLimitsStreamPayload({
          snapshot,
          compat: usageLimits,
        })
      : null;
  }

  #normalizeSnapshot(
    providerSessionId: string | null,
    snapshot: ClaudeLiveHeadersSnapshot
  ): ProviderUsageLimitsSnapshot | null {
    return this.#normalizer.normalize({
      collectedAt: snapshot.collectedAt,
      headers: snapshot.headers,
      providerScopeKey: this.#buildScopeKey(providerSessionId),
      source: snapshot.source,
    });
  }

  #buildRuntimeSnapshot(
    providerSessionId: string | null,
    usageLimits: NonNullable<CompatibleSessionUsageLimits>,
    collectedAt?: string
  ): ProviderUsageLimitsSnapshot | null {
    const windows: Array<ProviderUsageLimitWindow | null> = [
      usageLimits.currentSession
        ? {
            id: "primary" as const,
            label: "Session",
            percentUsed: usageLimits.currentSession.percentUsed,
            resetsAt: usageLimits.currentSession.resetsAt,
            windowKind: "session" as const,
          }
        : null,
      usageLimits.currentWeekAllModels
        ? {
            id: "secondary" as const,
            label: "Weekly",
            percentUsed: usageLimits.currentWeekAllModels.percentUsed,
            resetsAt: usageLimits.currentWeekAllModels.resetsAt,
            windowKind: "weekly" as const,
          }
        : null,
      usageLimits.currentWeekSonnetOnly
        ? {
            id: "tertiary" as const,
            label: "Sonnet Weekly",
            percentUsed: usageLimits.currentWeekSonnetOnly.percentUsed,
            resetsAt: usageLimits.currentWeekSonnetOnly.resetsAt,
            windowKind: "model-weekly" as const,
          }
        : null,
    ];
    const normalizedWindows = windows.filter(
      (window): window is ProviderUsageLimitWindow => window !== null
    );
    if (normalizedWindows.length === 0) {
      return null;
    }

    return {
      collectedAt: collectedAt ?? new Date().toISOString(),
      providerId: "claude",
      providerScopeKey: this.#buildScopeKey(providerSessionId),
      source: "claude_headers",
      windows: normalizedWindows,
    };
  }

  #buildScopeKey(providerSessionId: string | null): string {
    return buildProviderUsageLimitScopeKey({
      providerId: "claude",
      providerSessionId,
    });
  }
}

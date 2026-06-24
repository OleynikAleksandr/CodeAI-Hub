export type ProviderUsageLimitProviderId = "codex" | "claude" | "kimi";

export type ProviderUsageLimitWindowId = "primary" | "secondary" | "tertiary";

export type ProviderUsageLimitWindowKind =
  | "session"
  | "weekly"
  | "daily"
  | "model-weekly"
  | "provider-specific";

export type ProviderUsageLimitSource =
  | "codex_live"
  | "codex_rpc"
  | "codex_status"
  | "codex_rollout_fallback"
  | "claude_headers"
  | "claude_probe"
  | "kimi_unavailable";

export interface ProviderUsageLimitBucket {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
}

export type CompatibleSessionUsageLimits = {
  readonly currentSession?: ProviderUsageLimitBucket | null;
  readonly currentWeekAllModels?: ProviderUsageLimitBucket | null;
  readonly currentWeekSonnetOnly?: ProviderUsageLimitBucket | null;
} | null;

export type CompatibleSessionUsageLimitLabels = {
  readonly currentSession?: string | null;
  readonly currentWeekAllModels?: string | null;
  readonly currentWeekSonnetOnly?: string | null;
} | null;

export interface ProviderUsageLimitsDiagnostics {
  readonly changed?: boolean;
  readonly fallbackReason?:
    | "min_refresh_interval"
    | "reader_missing"
    | "read_failed"
    | "snapshot_unavailable";
  readonly force: boolean;
  readonly fromCache: boolean;
  readonly readerRegistered: boolean;
  readonly result:
    | "cache_hit"
    | "fresh_read"
    | "fallback_cached"
    | "unavailable";
  readonly source: ProviderUsageLimitSource | null;
}

export type ProviderUsageLimitWindow = ProviderUsageLimitBucket & {
  readonly id: ProviderUsageLimitWindowId;
  readonly label: string;
  readonly windowKind: ProviderUsageLimitWindowKind;
};

export interface ProviderUsageLimitsSnapshot {
  readonly collectedAt: string;
  readonly providerId: ProviderUsageLimitProviderId;
  readonly providerScopeKey: string;
  readonly source: ProviderUsageLimitSource;
  readonly windows: readonly ProviderUsageLimitWindow[];
}

export interface ReadProviderUsageLimitsParams {
  readonly environment?: NodeJS.ProcessEnv;
  readonly force?: boolean;
  readonly providerId: ProviderUsageLimitProviderId;
  readonly providerSessionId: string | null;
  readonly runtimeSessionId: string;
  readonly workspacePath: string;
}

export interface ProviderUsageLimitsReadResult {
  readonly compat: CompatibleSessionUsageLimits;
  readonly diagnostics?: ProviderUsageLimitsDiagnostics;
  readonly snapshot: ProviderUsageLimitsSnapshot | null;
}

export interface ProviderUsageLimitsStreamEventData {
  readonly collectedAt: string;
  readonly diagnostics?: ProviderUsageLimitsDiagnostics;
  readonly kind: "usage_limits";
  readonly providerScopeKey: string;
  readonly source: ProviderUsageLimitSource;
  readonly usageLimitLabels?: CompatibleSessionUsageLimitLabels;
  readonly usageLimits: CompatibleSessionUsageLimits;
}

export interface ProviderUsageLimitsStreamPayload {
  readonly data: ProviderUsageLimitsStreamEventData;
  readonly providerScopeKey: string;
  readonly usageLimits: CompatibleSessionUsageLimits;
}

export interface ProviderUsageLimitsAdapter {
  toCompat(
    snapshot: ProviderUsageLimitsSnapshot | null
  ): CompatibleSessionUsageLimits;
}

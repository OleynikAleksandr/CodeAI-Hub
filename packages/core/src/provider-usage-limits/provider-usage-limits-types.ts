export type ProviderUsageLimitProviderId = "codex" | "claude" | "gemini";

export type ProviderUsageLimitWindowId = "primary" | "secondary" | "tertiary";

export type ProviderUsageLimitWindowKind =
  | "session"
  | "weekly"
  | "daily"
  | "model-weekly"
  | "provider-specific";

export type ProviderUsageLimitSource =
  | "codex_rpc"
  | "codex_status"
  | "codex_rollout_fallback"
  | "claude_headers"
  | "claude_probe"
  | "gemini_quota_api"
  | "gemini_cli_fallback";

export type ProviderUsageLimitBucket = {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
};

export type CompatibleSessionUsageLimits = {
  readonly currentSession?: ProviderUsageLimitBucket | null;
  readonly currentWeekAllModels?: ProviderUsageLimitBucket | null;
  readonly currentWeekSonnetOnly?: ProviderUsageLimitBucket | null;
} | null;

export type ProviderUsageLimitsDiagnostics = {
  readonly result:
    | "cache_hit"
    | "fresh_read"
    | "fallback_cached"
    | "unavailable";
  readonly fallbackReason?:
    | "min_refresh_interval"
    | "reader_missing"
    | "read_failed"
    | "snapshot_unavailable";
  readonly source: ProviderUsageLimitSource | null;
  readonly fromCache: boolean;
  readonly readerRegistered: boolean;
  readonly force: boolean;
  readonly changed?: boolean;
};

export type ProviderUsageLimitWindow = ProviderUsageLimitBucket & {
  readonly id: ProviderUsageLimitWindowId;
  readonly label: string;
  readonly windowKind: ProviderUsageLimitWindowKind;
};

export type ProviderUsageLimitsSnapshot = {
  readonly providerId: ProviderUsageLimitProviderId;
  readonly providerScopeKey: string;
  readonly source: ProviderUsageLimitSource;
  readonly windows: readonly ProviderUsageLimitWindow[];
  readonly collectedAt: string;
};

export type ReadProviderUsageLimitsParams = {
  readonly providerId: ProviderUsageLimitProviderId;
  readonly workspacePath: string;
  readonly runtimeSessionId: string;
  readonly providerSessionId: string | null;
  readonly environment?: NodeJS.ProcessEnv;
  readonly force?: boolean;
};

export type ProviderUsageLimitsReadResult = {
  readonly snapshot: ProviderUsageLimitsSnapshot | null;
  readonly compat: CompatibleSessionUsageLimits;
  readonly diagnostics?: ProviderUsageLimitsDiagnostics;
};

export type ProviderUsageLimitsStreamEventData = {
  readonly kind: "usage_limits";
  readonly usageLimits: CompatibleSessionUsageLimits;
  readonly providerScopeKey: string;
  readonly source: ProviderUsageLimitSource;
  readonly collectedAt: string;
  readonly diagnostics?: ProviderUsageLimitsDiagnostics;
};

export type ProviderUsageLimitsStreamPayload = {
  readonly providerScopeKey: string;
  readonly usageLimits: CompatibleSessionUsageLimits;
  readonly data: ProviderUsageLimitsStreamEventData;
};

export type ProviderUsageLimitsAdapter = {
  toCompat(
    snapshot: ProviderUsageLimitsSnapshot | null
  ): CompatibleSessionUsageLimits;
};

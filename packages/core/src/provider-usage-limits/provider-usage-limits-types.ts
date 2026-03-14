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
};

export type ProviderUsageLimitsAdapter = {
  toCompat(
    snapshot: ProviderUsageLimitsSnapshot | null
  ): CompatibleSessionUsageLimits;
};

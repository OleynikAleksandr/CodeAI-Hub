export type ClaudeInstallerPaths = {
  readonly macOS: string;
  readonly linux: string;
  readonly windows: string;
};

export type ClaudeWorkspaceOptions = {
  readonly workspacePath: string;
  readonly claudeProjectSlug: string;
  readonly settingsPath?: string;
  readonly defaultModel?: string;
};

export type ModuleReporter = {
  readonly info?: (message: string) => void;
  readonly warn?: (message: string) => void;
  readonly error?: (message: string, error?: unknown) => void;
  readonly progress?: (event: ModuleProgressEvent) => void;
};

export type ClaudeUsageLimitBucket = {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
};

export type ClaudeUsageLimits = {
  readonly currentSession?: ClaudeUsageLimitBucket | null;
  readonly currentWeekAllModels?: ClaudeUsageLimitBucket | null;
  readonly currentWeekSonnetOnly?: ClaudeUsageLimitBucket | null;
} | null;

export type ClaudeUsageLimitsReadParams = {
  readonly workspacePath: string;
  readonly runtimeSessionId: string;
  readonly providerSessionId: string | null;
  readonly environment?: NodeJS.ProcessEnv;
  readonly force?: boolean;
};

export type ClaudeUsageLimitsStreamPayload = {
  readonly providerScopeKey: string;
  readonly usageLimits: ClaudeUsageLimits;
  readonly data: {
    readonly kind: "usage_limits";
    readonly usageLimits: ClaudeUsageLimits;
    readonly providerScopeKey: string;
    readonly source: string;
    readonly collectedAt: string;
  };
};

export type ClaudeUsageLimitsFacadeBridge = {
  readStreamPayload(
    params: ClaudeUsageLimitsReadParams
  ): Promise<ClaudeUsageLimitsStreamPayload | null>;
  getCachedStreamPayload(params: {
    readonly providerSessionId: string | null;
  }): ClaudeUsageLimitsStreamPayload | null;
};

export type ClaudeModuleOptions = {
  readonly installerPaths: ClaudeInstallerPaths;
  readonly workspace: ClaudeWorkspaceOptions;
  readonly enableDebugStreams?: boolean;
  readonly reporter?: ModuleReporter;
  readonly usageLimitsFacade?: ClaudeUsageLimitsFacadeBridge;
};

export type ClaudeStreamMessage = {
  readonly type: string;
  readonly uuid?: string;
  readonly session_id?: string;
  readonly event?: unknown;
  readonly modelUsage?: unknown;
  readonly model_usage?: unknown;
  readonly message?: {
    readonly content?: unknown;
    readonly model?: string;
  };
  readonly content?: unknown;
  readonly result?: unknown;
  readonly total_cost_usd?: number;
  readonly usage?: unknown;
  readonly duration_ms?: number;
  readonly duration_api_ms?: number;
  readonly num_turns?: number;
  readonly timestamp?: string;
} & Record<string, unknown>;

export type ModuleProgressEvent = {
  readonly label: string;
  readonly detail?: string;
  readonly scope?: string;
  readonly phase?: "install" | "provider" | "finalize";
  readonly firstRun?: boolean;
};

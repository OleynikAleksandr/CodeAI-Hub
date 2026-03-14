export type GeminiInstallerPaths = {
  readonly macOS: string;
  readonly linux: string;
  readonly windows: string;
};

export type GeminiWorkspaceOptions = {
  readonly workspacePath: string;
  readonly defaultModel?: string;
  readonly thinkingLevelByModel?: Record<string, string>;
  readonly settingsPath?: string;
};

export type GeminiCredentialsOptions = {
  readonly directory?: string;
  readonly requiredFiles?: readonly string[];
};

export type GeminiUsageLimitBucket = {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
};

export type GeminiUsageLimits = {
  readonly currentSession?: GeminiUsageLimitBucket | null;
  readonly currentWeekAllModels?: GeminiUsageLimitBucket | null;
  readonly currentWeekSonnetOnly?: GeminiUsageLimitBucket | null;
} | null;

export type GeminiUsageLimitsReadParams = {
  readonly workspacePath: string;
  readonly runtimeSessionId: string;
  readonly providerSessionId: string | null;
  readonly environment?: NodeJS.ProcessEnv;
  readonly force?: boolean;
};

export type GeminiUsageLimitsStreamPayload = {
  readonly providerScopeKey: string;
  readonly usageLimits: GeminiUsageLimits;
  readonly data: {
    readonly kind: "usage_limits";
    readonly usageLimits: GeminiUsageLimits;
    readonly providerScopeKey: string;
    readonly source: string;
    readonly collectedAt: string;
  };
};

export type GeminiUsageLimitsFacadeBridge = {
  readStreamPayload(
    params: GeminiUsageLimitsReadParams
  ): Promise<GeminiUsageLimitsStreamPayload | null>;
  getCachedStreamPayload(params: {
    readonly providerSessionId: string | null;
  }): GeminiUsageLimitsStreamPayload | null;
};

const areGeminiUsageLimitBucketsEqual = (
  left: GeminiUsageLimitBucket | null | undefined,
  right: GeminiUsageLimitBucket | null | undefined
): boolean =>
  left?.percentUsed === right?.percentUsed &&
  left?.resetsAt === right?.resetsAt;

const areGeminiUsageLimitsEqual = (
  left: GeminiUsageLimits,
  right: GeminiUsageLimits
): boolean =>
  left === right ||
  Boolean(
    left &&
      right &&
      areGeminiUsageLimitBucketsEqual(
        left.currentSession,
        right.currentSession
      ) &&
      areGeminiUsageLimitBucketsEqual(
        left.currentWeekAllModels,
        right.currentWeekAllModels
      ) &&
      areGeminiUsageLimitBucketsEqual(
        left.currentWeekSonnetOnly,
        right.currentWeekSonnetOnly
      )
  );

export const areGeminiUsageLimitsPayloadEqual = (
  left: GeminiUsageLimitsStreamPayload | null,
  right: GeminiUsageLimitsStreamPayload | null
): boolean =>
  left?.providerScopeKey === right?.providerScopeKey &&
  left?.data.source === right?.data.source &&
  left?.data.collectedAt === right?.data.collectedAt &&
  areGeminiUsageLimitsEqual(
    left?.usageLimits ?? null,
    right?.usageLimits ?? null
  );

export type ModuleReporter = {
  readonly info?: (message: string, metadata?: Record<string, unknown>) => void;
  readonly warn?: (message: string, metadata?: Record<string, unknown>) => void;
  readonly error?: (
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>
  ) => void;
  readonly progress?: (event: ModuleProgressEvent) => void;
};

export type GeminiModuleOptions = {
  readonly installerPaths: GeminiInstallerPaths;
  readonly workspace: GeminiWorkspaceOptions;
  readonly reporter?: ModuleReporter;
  readonly enableDebugLogging?: boolean;
  readonly credentials?: GeminiCredentialsOptions;
  readonly usageLimitsFacade?: GeminiUsageLimitsFacadeBridge;
};

export type GeminiSessionEvent = {
  readonly type: string;
  readonly provider?: string;
  readonly content?: string;
  readonly data?: unknown;
  readonly payload?: unknown;
};

export type GeminiCliBridgeMetadata = {
  readonly version: string;
  readonly preparedAt: string;
  readonly source: string;
  readonly cli?: {
    readonly package: string;
    readonly requiredVersion?: string;
    readonly resolvedVersion?: string;
    readonly location?: string;
  };
  readonly cliCore?: {
    readonly package: string;
    readonly version: string;
    readonly toolExecutionBackend?:
      | "legacy_non_interactive"
      | "scheduler_fallback";
  };
};

export type ModuleProgressEvent = {
  readonly label: string;
  readonly detail?: string;
  readonly scope?: string;
  readonly phase?: "install" | "provider" | "finalize";
  readonly firstRun?: boolean;
};

export type GeminiUpdateResult = {
  readonly cliVersion: string;
  readonly coreVersion: string;
};

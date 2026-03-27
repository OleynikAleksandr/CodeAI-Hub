export interface GeminiInstallerPaths {
  readonly linux: string;
  readonly macOS: string;
  readonly windows: string;
}

export interface GeminiWorkspaceOptions {
  readonly defaultModel?: string;
  readonly settingsPath?: string;
  readonly thinkingLevelByModel?: Record<string, string>;
  readonly workspacePath: string;
}

export interface GeminiCredentialsOptions {
  readonly directory?: string;
  readonly requiredFiles?: readonly string[];
}

export interface GeminiUsageLimitBucket {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
}

export type GeminiUsageLimits = {
  readonly currentSession?: GeminiUsageLimitBucket | null;
  readonly currentWeekAllModels?: GeminiUsageLimitBucket | null;
  readonly currentWeekSonnetOnly?: GeminiUsageLimitBucket | null;
} | null;

export interface GeminiUsageLimitsReadParams {
  readonly environment?: NodeJS.ProcessEnv;
  readonly force?: boolean;
  readonly providerSessionId: string | null;
  readonly runtimeSessionId: string;
  readonly workspacePath: string;
}

export interface GeminiUsageLimitsStreamPayload {
  readonly data: {
    readonly kind: "usage_limits";
    readonly usageLimits: GeminiUsageLimits;
    readonly providerScopeKey: string;
    readonly source: string;
    readonly collectedAt: string;
  };
  readonly providerScopeKey: string;
  readonly usageLimits: GeminiUsageLimits;
}

export interface GeminiUsageLimitsFacadeBridge {
  getCachedStreamPayload(params: {
    readonly providerSessionId: string | null;
  }): GeminiUsageLimitsStreamPayload | null;
  readStreamPayload(
    params: GeminiUsageLimitsReadParams
  ): Promise<GeminiUsageLimitsStreamPayload | null>;
}

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

export interface ModuleReporter {
  readonly error?: (
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>
  ) => void;
  readonly info?: (message: string, metadata?: Record<string, unknown>) => void;
  readonly progress?: (event: ModuleProgressEvent) => void;
  readonly warn?: (message: string, metadata?: Record<string, unknown>) => void;
}

export interface GeminiModuleOptions {
  readonly credentials?: GeminiCredentialsOptions;
  readonly enableDebugLogging?: boolean;
  readonly installerPaths: GeminiInstallerPaths;
  readonly reporter?: ModuleReporter;
  readonly usageLimitsFacade?: GeminiUsageLimitsFacadeBridge;
  readonly workspace: GeminiWorkspaceOptions;
}

export interface GeminiSessionEvent {
  readonly content?: string;
  readonly data?: unknown;
  readonly payload?: unknown;
  readonly provider?: string;
  readonly type: string;
}

export interface GeminiCliBridgeMetadata {
  readonly cli?: {
    readonly package: string;
    readonly requiredVersion?: string;
    readonly resolvedVersion?: string;
    readonly location?: string;
  };
  readonly cliCore?: {
    readonly package: string;
    readonly version: string;
  };
  readonly preparedAt: string;
  readonly source: string;
  readonly version: string;
}

export interface ModuleProgressEvent {
  readonly detail?: string;
  readonly firstRun?: boolean;
  readonly label: string;
  readonly phase?: "install" | "provider" | "finalize";
  readonly scope?: string;
}

export interface GeminiUpdateResult {
  readonly cliVersion: string;
  readonly coreVersion: string;
}

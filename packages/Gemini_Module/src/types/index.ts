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

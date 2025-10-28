export type GeminiInstallerPaths = {
  readonly macOS: string;
  readonly linux: string;
  readonly windows: string;
};

export type GeminiWorkspaceOptions = {
  readonly workspacePath: string;
  readonly defaultModel?: string;
  readonly settingsPath?: string;
  readonly binaryPathOverride?: string;
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
};

export type GeminiModuleOptions = {
  readonly installerPaths: GeminiInstallerPaths;
  readonly workspace: GeminiWorkspaceOptions;
  readonly reporter?: ModuleReporter;
  readonly enableDebugLogging?: boolean;
  readonly minimumVersion?: string;
  readonly credentials?: GeminiCredentialsOptions;
};

export type GeminiSessionEvent = {
  readonly type: string;
  readonly payload?: unknown;
};

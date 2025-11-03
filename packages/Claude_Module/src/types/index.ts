export type ClaudeInstallerPaths = {
  readonly macOS: string;
  readonly linux: string;
  readonly windows: string;
};

export type ClaudeWorkspaceOptions = {
  readonly workspacePath: string;
  readonly claudeProjectSlug: string;
  readonly settingsPath?: string;
};

export type ModuleReporter = {
  readonly info?: (message: string) => void;
  readonly warn?: (message: string) => void;
  readonly error?: (message: string, error?: unknown) => void;
  readonly progress?: (event: ModuleProgressEvent) => void;
};

export type ClaudeModuleOptions = {
  readonly installerPaths: ClaudeInstallerPaths;
  readonly workspace: ClaudeWorkspaceOptions;
  readonly enableDebugStreams?: boolean;
  readonly reporter?: ModuleReporter;
};

export type ClaudeStreamMessage = {
  readonly type: string;
  readonly uuid?: string;
  readonly session_id?: string;
  readonly event?: unknown;
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

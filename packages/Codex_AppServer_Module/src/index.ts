export interface CodexInstallerPaths {
  readonly linux: string;
  readonly macOS: string;
  readonly windows: string;
}

export type CodexReasoningEffort = "low" | "medium" | "high" | "xhigh";
export const CODEX_APPLIED_TURN_CONFIG_KEY = "__codeaiAppliedTurnConfig";

export interface CodexAppliedTurnConfig {
  readonly modelId?: string;
  readonly providerId: "codexCli";
  readonly reasoningEffort?: CodexReasoningEffort;
  readonly source: "settings_snapshot" | "switch_request";
  readonly translationEngineId?: string;
}

export interface CodexWorkspaceOptions {
  readonly defaultApprovalMode?: string;
  readonly defaultModel?: string;
  readonly defaultReasoningEffort?: CodexReasoningEffort;
  readonly defaultResponsePolicy?: string;
  readonly defaultSandboxMode?: string;
  readonly skipGitRepoCheck?: boolean;
  readonly workspacePath: string;
}

export interface ModuleProgressEvent {
  readonly detail?: string;
  readonly firstRun?: boolean;
  readonly label: string;
  readonly phase?: "install" | "provider" | "finalize";
  readonly scope?: string;
}

export interface ModuleReporter {
  readonly error?: (message: string, error?: unknown) => void;
  readonly info?: (message: string) => void;
  readonly progress?: (event: ModuleProgressEvent) => void;
  readonly warn?: (message: string) => void;
}

export interface CodexUsageLimitBucket {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
}

export type CodexUsageLimits = {
  readonly currentSession?: CodexUsageLimitBucket | null;
  readonly currentWeekAllModels?: CodexUsageLimitBucket | null;
  readonly currentWeekSonnetOnly?: CodexUsageLimitBucket | null;
} | null;

export interface CodexUsageLimitsReadParams {
  readonly environment?: NodeJS.ProcessEnv;
  readonly force?: boolean;
  readonly providerSessionId: string | null;
  readonly runtimeSessionId: string;
  readonly workspacePath: string;
}

export interface CodexUsageLimitsStreamPayload {
  readonly data: {
    readonly kind: "usage_limits";
    readonly usageLimits: CodexUsageLimits;
    readonly providerScopeKey: string;
    readonly source: string;
    readonly collectedAt: string;
  };
  readonly providerScopeKey: string;
  readonly usageLimits: CodexUsageLimits;
}

export interface CodexUsageLimitsFacadeBridge {
  getCachedStreamPayload(params: {
    readonly providerSessionId: string | null;
  }): CodexUsageLimitsStreamPayload | null;
  readStreamPayload(
    params: CodexUsageLimitsReadParams
  ): Promise<CodexUsageLimitsStreamPayload | null>;
}

export interface CodexThreadOptions {
  readonly cwd?: string;
  readonly model?: string;
  readonly modelReasoningEffort?: CodexReasoningEffort;
}

export interface CodexTurnOptions {
  readonly outputSchema?: unknown;
  readonly [CODEX_APPLIED_TURN_CONFIG_KEY]?: CodexAppliedTurnConfig;
  readonly [key: string]: unknown;
}

export interface CodexThreadEvent {
  readonly type: string;
  readonly [key: string]: unknown;
}

export interface CodexThreadItem {
  readonly id?: string;
  readonly type: string;
  readonly [key: string]: unknown;
}

export interface CodexModuleOptions {
  readonly enableDebugStreams?: boolean;
  readonly installerPaths: CodexInstallerPaths;
  readonly reporter?: ModuleReporter;
  readonly usageLimitsFacade?: CodexUsageLimitsFacadeBridge;
  readonly workspace: CodexWorkspaceOptions;
}

export class CodexProviderAdapter {
  private readonly options: CodexModuleOptions;

  constructor(options: CodexModuleOptions) {
    this.options = options;
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  createSession(_workspacePath?: string): Promise<string> {
    return Promise.reject(
      new Error("Codex app-server adapter scaffold is not implemented yet.")
    );
  }

  closeSession(_sessionId: string): Promise<void> {
    return Promise.resolve();
  }

  sendMessage(
    _sessionId: string,
    _content: string,
    _turnOptions?: CodexTurnOptions
  ): Promise<void> {
    return Promise.reject(
      new Error("Codex app-server adapter scaffold is not implemented yet.")
    );
  }

  subscribe(
    _sessionId: string,
    _listener: (payload: unknown) => void
  ): () => void {
    const reporter = this.options.reporter;
    return () => reporter?.info?.("Codex app-server scaffold unsubscribe noop");
  }
}

export type CodexSandboxMode = string;
export type CodexApprovalMode = string;

export interface ClaudeInstallerPaths {
  readonly linux: string;
  readonly macOS: string;
  readonly windows: string;
}

export {
  CLAUDE_MODEL_CAPABILITIES,
  type ClaudeModelAliasId,
  type ClaudeModelCapabilities,
  type ClaudeThinkingEffort,
  findClaudeModelCapabilities,
  isClaudeModelAliasId,
} from "./claude-model-capabilities";

export interface ClaudeWorkspaceOptions {
  readonly claudeProjectSlug: string;
  readonly defaultModel?: string;
  readonly settingsPath?: string;
  readonly workspacePath: string;
}

export interface ModuleReporter {
  readonly error?: (message: string, error?: unknown) => void;
  readonly info?: (message: string) => void;
  readonly progress?: (event: ModuleProgressEvent) => void;
  readonly warn?: (message: string) => void;
}

export interface ClaudeUsageLimitBucket {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
}

export type ClaudeUsageLimits = {
  readonly currentSession?: ClaudeUsageLimitBucket | null;
  readonly currentWeekAllModels?: ClaudeUsageLimitBucket | null;
  readonly currentWeekSonnetOnly?: ClaudeUsageLimitBucket | null;
} | null;

export interface ClaudeUsageLimitsReadParams {
  readonly environment?: NodeJS.ProcessEnv;
  readonly force?: boolean;
  readonly providerSessionId: string | null;
  readonly runtimeSessionId: string;
  readonly workspacePath: string;
}

export interface ClaudeUsageLimitsStreamPayload {
  readonly data: {
    readonly kind: "usage_limits";
    readonly usageLimits: ClaudeUsageLimits;
    readonly providerScopeKey: string;
    readonly source: string;
    readonly collectedAt: string;
  };
  readonly providerScopeKey: string;
  readonly usageLimits: ClaudeUsageLimits;
}

export interface ClaudeUsageLimitsFacadeBridge {
  getCachedStreamPayload(params: {
    readonly providerSessionId: string | null;
  }): ClaudeUsageLimitsStreamPayload | null;
  readStreamPayload(
    params: ClaudeUsageLimitsReadParams
  ): Promise<ClaudeUsageLimitsStreamPayload | null>;
}

export interface ClaudeModuleOptions {
  readonly enableDebugStreams?: boolean;
  readonly installerPaths: ClaudeInstallerPaths;
  readonly reporter?: ModuleReporter;
  readonly usageLimitsFacade?: ClaudeUsageLimitsFacadeBridge;
  readonly workspace: ClaudeWorkspaceOptions;
}

export type ClaudeStreamMessage = {
  readonly type: string;
  readonly uuid?: string;
  readonly session_id?: string;
  readonly event?: unknown;
  readonly modelUsage?: unknown;
  readonly model_usage?: unknown;
  readonly message?: {
    readonly content?: unknown;
    readonly id?: string;
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

export interface ModuleProgressEvent {
  readonly detail?: string;
  readonly firstRun?: boolean;
  readonly label: string;
  readonly phase?: "install" | "provider" | "finalize";
  readonly scope?: string;
}

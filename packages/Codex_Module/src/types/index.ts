import type {
  ApprovalMode,
  SandboxMode,
  ThreadEvent,
  ThreadItem,
  ThreadOptions,
  TurnOptions,
} from "@openai/codex-sdk";
import type { CodexResponsePolicy } from "../response-policy/response-policy-types";

export interface CodexInstallerPaths {
  readonly linux: string;
  readonly macOS: string;
  readonly windows: string;
}

export type CodexReasoningEffort = "low" | "medium" | "high" | "xhigh";

export interface CodexWorkspaceOptions {
  readonly defaultApprovalMode?: ApprovalMode;
  readonly defaultModel?: string;
  readonly defaultReasoningEffort?: CodexReasoningEffort;
  readonly defaultResponsePolicy?: CodexResponsePolicy;
  readonly defaultSandboxMode?: SandboxMode;
  readonly skipGitRepoCheck?: boolean;
  readonly workspacePath: string;
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

export interface CodexModuleOptions {
  readonly enableDebugStreams?: boolean;
  readonly installerPaths: CodexInstallerPaths;
  readonly reporter?: ModuleReporter;
  readonly usageLimitsFacade?: CodexUsageLimitsFacadeBridge;
  readonly workspace: CodexWorkspaceOptions;
}

export type CodexThreadEvent = ThreadEvent;
export type CodexThreadItem = ThreadItem;
export interface CodexThreadOptions extends ThreadOptions {
  readonly modelReasoningEffort?: CodexReasoningEffort;
}
export interface CodexTurnOptions extends TurnOptions {
  readonly outputSchema?: unknown;
}
export type CodexSandboxMode = SandboxMode;
export type CodexApprovalMode = ApprovalMode;
export type {
  CodexResponseMode,
  CodexResponsePolicy,
} from "../response-policy/response-policy-types";

export interface ModuleProgressEvent {
  readonly detail?: string;
  readonly firstRun?: boolean;
  readonly label: string;
  readonly phase?: "install" | "provider" | "finalize";
  readonly scope?: string;
}

import type {
  ApprovalMode,
  SandboxMode,
  ThreadEvent,
  ThreadItem,
  ThreadOptions,
  TurnOptions,
} from "@openai/codex-sdk";
import type { CodexResponsePolicy } from "../response-policy/response-policy-types";

export type CodexInstallerPaths = {
  readonly macOS: string;
  readonly linux: string;
  readonly windows: string;
};

export type CodexReasoningEffort = "low" | "medium" | "high" | "xhigh";

export type CodexWorkspaceOptions = {
  readonly workspacePath: string;
  readonly defaultSandboxMode?: SandboxMode;
  readonly defaultApprovalMode?: ApprovalMode;
  readonly defaultModel?: string;
  readonly defaultReasoningEffort?: CodexReasoningEffort;
  readonly defaultResponsePolicy?: CodexResponsePolicy;
  readonly skipGitRepoCheck?: boolean;
};

export type ModuleReporter = {
  readonly info?: (message: string) => void;
  readonly warn?: (message: string) => void;
  readonly error?: (message: string, error?: unknown) => void;
  readonly progress?: (event: ModuleProgressEvent) => void;
};

export type CodexModuleOptions = {
  readonly installerPaths: CodexInstallerPaths;
  readonly workspace: CodexWorkspaceOptions;
  readonly reporter?: ModuleReporter;
  readonly enableDebugStreams?: boolean;
};

export type CodexThreadEvent = ThreadEvent;
export type CodexThreadItem = ThreadItem;
export type CodexThreadOptions = ThreadOptions & {
  readonly modelReasoningEffort?: CodexReasoningEffort;
};
export type CodexTurnOptions = TurnOptions & {
  readonly outputSchema?: unknown;
};
export type CodexSandboxMode = SandboxMode;
export type CodexApprovalMode = ApprovalMode;
export type {
  CodexResponseMode,
  CodexResponsePolicy,
} from "../response-policy/response-policy-types";

export type ModuleProgressEvent = {
  readonly label: string;
  readonly detail?: string;
  readonly scope?: string;
  readonly phase?: "install" | "provider" | "finalize";
  readonly firstRun?: boolean;
};

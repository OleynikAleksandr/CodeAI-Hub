import type {
  ClaudeModuleOptions,
  ModuleReporter,
} from "@codeai-hub/claude-module";
import type { CodexModuleOptions } from "@codeai-hub/codex-module";
import type { GeminiInstallerPaths } from "./provider-installer-paths";

export interface GeminiModuleOptions {
  readonly credentials?: {
    readonly directory?: string;
    readonly requiredFiles?: readonly string[];
  };
  readonly enableDebugLogging?: boolean;
  readonly installerPaths: GeminiInstallerPaths;
  readonly reporter?: ModuleReporter;
  readonly usageLimitsFacade?: GeminiUsageLimitsFacadeBridge;
  readonly workspace: {
    readonly workspacePath: string;
    readonly defaultModel?: string;
    readonly thinkingLevelByModel?: Record<string, string>;
    readonly settingsPath?: string;
  };
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
  readStreamPayload(params: {
    readonly workspacePath: string;
    readonly runtimeSessionId: string;
    readonly providerSessionId: string | null;
    readonly environment?: NodeJS.ProcessEnv;
    readonly force?: boolean;
  }): Promise<GeminiUsageLimitsStreamPayload | null>;
}

export interface Provider {
  readonly description: string;
  readonly id: string;
  readonly name: string;
  readonly status: "active" | "inactive" | "degraded";
  readonly statusMessage?: string;
}

export interface ProviderAdapter {
  closeSession(sessionId: string): Promise<void>;
  createSession(workspacePath?: string): Promise<string>;
  initialize(): Promise<void>;
  resumeSession?(sessionId: string, workspacePath?: string): Promise<string>;
  sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): Promise<void>;
  subscribe(
    sessionId: string,
    listener: (payload: unknown) => void
  ): () => void;
}

export type ProviderDescriptor = Provider & {
  readonly adapter?: ProviderAdapter;
};

export type MutableProviderDescriptor = {
  -readonly [Key in keyof ProviderDescriptor]: ProviderDescriptor[Key];
};

export type ClaudeAdapterCtor = new (
  options: ClaudeModuleOptions
) => ProviderAdapter;

export type CodexAdapterCtor = new (
  options: CodexModuleOptions
) => ProviderAdapter;

export type GeminiAdapterCtor = new (
  options: GeminiModuleOptions
) => ProviderAdapter;

import type { Config } from "@google/gemini-cli-core/dist/src/config/config";

export type GeminiEventType =
  import("@google/gemini-cli-core/dist/src/core/turn").GeminiEventType;
export type ServerGeminiStreamEvent =
  import("@google/gemini-cli-core/dist/src/core/turn").ServerGeminiStreamEvent;
export type CompletedToolCall =
  import("@google/gemini-cli-core/dist/src/scheduler/types").CompletedToolCall;
export type ToolCallRequestInfo =
  import("@google/gemini-cli-core/dist/src/scheduler/types").ToolCallRequestInfo;

export interface CliArgs {
  readonly allowedMcpServerNames?: readonly string[];
  readonly allowedTools?: readonly string[];
  readonly approvalMode?: string;
  readonly debug?: boolean;
  readonly deleteSession?: string;
  readonly includeDirectories?: readonly string[];
  readonly listExtensions?: boolean;
  readonly listSessions?: boolean;
  readonly model?: string;
  readonly prompt?: string;
  readonly promptInteractive?: string;
  readonly yolo?: boolean;
  readonly [key: string]: unknown;
}

export interface LoadedGeminiSettings {
  readonly merged: Record<string, unknown> & {
    readonly security?: {
      readonly auth?: {
        readonly selectedType?: string;
      };
    };
  };
}

export interface GeminiCliConfigModule {
  readonly loadCliConfig: (
    settings: unknown,
    sessionId: string,
    argv: CliArgs,
    cwd?: string
  ) => Promise<Config>;
}

export interface GeminiCliSettingsModule {
  readonly loadSettings: (workspaceDir?: string) => LoadedGeminiSettings;
  readonly migrateDeprecatedSettings?: (
    loadedSettings?: unknown,
    extensionManager?: unknown
  ) => void;
}

export type GeminiCliExtensionModule = Record<string, never>;
export type GeminiCliExtensionEnablementModule = Record<string, never>;
export type GeminiTurnModule =
  typeof import("@google/gemini-cli-core/dist/src/core/turn");

export interface CoreToolSchedulerModule {
  readonly CoreToolScheduler: new (options: {
    readonly context: unknown;
    readonly getPreferredEditor: () => undefined;
    readonly onAllToolCallsComplete?: (
      completedToolCalls: readonly CompletedToolCall[]
    ) => void | Promise<void>;
  }) => {
    schedule(
      request: ToolCallRequestInfo | readonly ToolCallRequestInfo[],
      signal: AbortSignal
    ): Promise<void>;
  };
}

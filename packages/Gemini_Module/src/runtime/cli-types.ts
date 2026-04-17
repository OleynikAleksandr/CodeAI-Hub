import type * as CliConfigModule from "@google/gemini-cli/dist/src/config/config";
import type * as CliExtensionModule from "@google/gemini-cli/dist/src/config/extension";
import type * as CliExtensionEnablementModule from "@google/gemini-cli/dist/src/config/extensions/extensionEnablement";
import type * as CliSettingsModule from "@google/gemini-cli/dist/src/config/settings";
import type * as CoreContentModule from "@google/gemini-cli-core/dist/src/core/contentGenerator";
import type * as ToolSchedulerModule from "@google/gemini-cli-core/dist/src/core/coreToolScheduler";
import type * as TurnModule from "@google/gemini-cli-core/dist/src/core/turn";
import type * as ThoughtUtilsModule from "@google/gemini-cli-core/dist/src/utils/thoughtUtils";
import type { GeminiCliBridgeMetadata } from "../types";

export interface GeminiConversationMessage {
  readonly content?: unknown;
  readonly displayContent?: unknown;
  readonly thoughts?: ReadonlyArray<{
    readonly subject?: string;
    readonly description: string;
  }>;
  readonly toolCalls?: ReadonlyArray<{
    readonly id?: string;
    readonly name: string;
    readonly args?: unknown;
    readonly result?: unknown;
  }>;
  readonly type: "user" | "gemini" | "info" | "error" | "warning";
}

export interface GeminiConversationRecord {
  readonly lastUpdated?: string;
  readonly messages: readonly GeminiConversationMessage[];
  readonly projectHash?: string;
  readonly sessionId: string;
  readonly startTime?: string;
}

export interface GeminiClientHistoryEntry {
  readonly parts: readonly Record<string, unknown>[];
  readonly role: "user" | "model";
}

export interface GeminiSessionUtilsModule {
  readonly convertSessionToClientHistory: (
    messages: readonly GeminiConversationMessage[]
  ) => GeminiClientHistoryEntry[];
}

export interface GeminiCliModules {
  readonly config: typeof CliConfigModule;
  readonly contentGenerator: typeof CoreContentModule;
  readonly extension: typeof CliExtensionModule;
  readonly extensionEnablement: typeof CliExtensionEnablementModule;
  readonly sessionUtils: GeminiSessionUtilsModule | null;
  readonly settings: typeof CliSettingsModule;
  readonly thoughtUtils: typeof ThoughtUtilsModule;
  readonly toolScheduler: typeof ToolSchedulerModule;
  readonly turn: typeof TurnModule;
}

export interface GeminiCliBridge {
  readonly metadata: GeminiCliBridgeMetadata;
  readonly modules: GeminiCliModules;
}

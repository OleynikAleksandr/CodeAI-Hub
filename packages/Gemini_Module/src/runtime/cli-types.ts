import type * as CoreContentModule from "@google/gemini-cli-core/dist/src/core/contentGenerator";
import type * as ThoughtUtilsModule from "@google/gemini-cli-core/dist/src/utils/thoughtUtils";
import type { GeminiCliBridgeMetadata } from "../types";
import type {
  CoreToolSchedulerModule,
  GeminiCliConfigModule,
  GeminiCliExtensionEnablementModule,
  GeminiCliExtensionModule,
  GeminiCliSettingsModule,
  GeminiTurnModule,
} from "./gemini-cli-compat";

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
  readonly config: GeminiCliConfigModule;
  readonly contentGenerator: typeof CoreContentModule;
  readonly extension: GeminiCliExtensionModule;
  readonly extensionEnablement: GeminiCliExtensionEnablementModule;
  readonly sessionUtils: GeminiSessionUtilsModule | null;
  readonly settings: GeminiCliSettingsModule;
  readonly thoughtUtils: typeof ThoughtUtilsModule;
  readonly toolScheduler: CoreToolSchedulerModule;
  readonly turn: GeminiTurnModule;
}

export interface GeminiCliBridge {
  readonly metadata: GeminiCliBridgeMetadata;
  readonly modules: GeminiCliModules;
}

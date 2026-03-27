import type * as CliConfigModule from "@google/gemini-cli/dist/src/config/config";
import type * as CliExtensionModule from "@google/gemini-cli/dist/src/config/extension";
import type * as CliExtensionEnablementModule from "@google/gemini-cli/dist/src/config/extensions/extensionEnablement";
import type * as CliSettingsModule from "@google/gemini-cli/dist/src/config/settings";
import type * as CoreContentModule from "@google/gemini-cli-core/dist/src/core/contentGenerator";
import type * as ToolSchedulerModule from "@google/gemini-cli-core/dist/src/core/coreToolScheduler";
import type * as TurnModule from "@google/gemini-cli-core/dist/src/core/turn";
import type * as ThoughtUtilsModule from "@google/gemini-cli-core/dist/src/utils/thoughtUtils";
import type { GeminiCliBridgeMetadata } from "../types";

export interface GeminiCliModules {
  readonly config: typeof CliConfigModule;
  readonly contentGenerator: typeof CoreContentModule;
  readonly extension: typeof CliExtensionModule;
  readonly extensionEnablement: typeof CliExtensionEnablementModule;
  readonly settings: typeof CliSettingsModule;
  readonly thoughtUtils: typeof ThoughtUtilsModule;
  readonly toolScheduler: typeof ToolSchedulerModule;
  readonly turn: typeof TurnModule;
}

export interface GeminiCliBridge {
  readonly metadata: GeminiCliBridgeMetadata;
  readonly modules: GeminiCliModules;
}

import type { LocalizationRuntimePayload } from "@codeai-hub/localization";
import {
  type ClaudeSettings,
  DEFAULT_CLAUDE_SETTINGS,
} from "./claude-settings";
import { type CodexSettings, DEFAULT_CODEX_SETTINGS } from "./codex-settings";
import {
  DEFAULT_GENERAL_SETTINGS,
  type GeneralSettings,
} from "./general-settings";

export interface SettingsSnapshot {
  readonly general: GeneralSettings;
  readonly providers: {
    readonly claude: ClaudeSettings;
    readonly codex: CodexSettings;
  };
}

export interface SettingsEnvelopePayload {
  readonly localizationRuntime: LocalizationRuntimePayload;
  readonly settings: SettingsSnapshot;
}

export const DEFAULT_SETTINGS_SNAPSHOT: SettingsSnapshot = {
  general: {
    ...DEFAULT_GENERAL_SETTINGS,
    localization: {
      ...DEFAULT_GENERAL_SETTINGS.localization,
      categories: { ...DEFAULT_GENERAL_SETTINGS.localization.categories },
    },
  },
  providers: {
    claude: DEFAULT_CLAUDE_SETTINGS,
    codex: DEFAULT_CODEX_SETTINGS,
  },
};

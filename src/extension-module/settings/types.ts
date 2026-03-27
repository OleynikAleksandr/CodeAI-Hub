import {
  type ClaudeSettings,
  DEFAULT_CLAUDE_SETTINGS,
} from "./claude-settings";
import { type CodexSettings, DEFAULT_CODEX_SETTINGS } from "./codex-settings";
import {
  DEFAULT_GEMINI_SETTINGS,
  type GeminiSettings,
} from "./gemini-settings";
import {
  DEFAULT_GENERAL_SETTINGS,
  type GeneralSettings,
} from "./general-settings";

export interface SettingsSnapshot {
  readonly general: GeneralSettings;
  readonly providers: {
    readonly claude: ClaudeSettings;
    readonly codex: CodexSettings;
    readonly gemini: GeminiSettings;
  };
}

export const DEFAULT_SETTINGS_SNAPSHOT: SettingsSnapshot = {
  general: DEFAULT_GENERAL_SETTINGS,
  providers: {
    claude: DEFAULT_CLAUDE_SETTINGS,
    codex: DEFAULT_CODEX_SETTINGS,
    gemini: DEFAULT_GEMINI_SETTINGS,
  },
};

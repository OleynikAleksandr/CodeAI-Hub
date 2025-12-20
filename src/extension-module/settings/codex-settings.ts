import {
  type AutoUpdateSettings,
  DEFAULT_AUTO_UPDATE_SETTINGS,
  normalizeAutoUpdateSettings,
} from "./auto-update-settings";
import { isRecord } from "./settings-utils";

export type CodexSettings = {
  readonly autoUpdate: AutoUpdateSettings;
};

export const DEFAULT_CODEX_SETTINGS: CodexSettings = {
  autoUpdate: DEFAULT_AUTO_UPDATE_SETTINGS,
};

export const normalizeCodexSettings = (value: unknown): CodexSettings => {
  if (!isRecord(value)) {
    return DEFAULT_CODEX_SETTINGS;
  }

  return {
    autoUpdate: normalizeAutoUpdateSettings(value.autoUpdate),
  };
};

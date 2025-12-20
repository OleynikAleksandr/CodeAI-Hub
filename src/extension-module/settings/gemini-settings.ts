import {
  type AutoUpdateSettings,
  DEFAULT_AUTO_UPDATE_SETTINGS,
  normalizeAutoUpdateSettings,
} from "./auto-update-settings";
import { isRecord } from "./settings-utils";

export type GeminiSettings = {
  readonly autoUpdate: AutoUpdateSettings;
};

export const DEFAULT_GEMINI_SETTINGS: GeminiSettings = {
  autoUpdate: DEFAULT_AUTO_UPDATE_SETTINGS,
};

export const normalizeGeminiSettings = (value: unknown): GeminiSettings => {
  if (!isRecord(value)) {
    return DEFAULT_GEMINI_SETTINGS;
  }

  return {
    autoUpdate: normalizeAutoUpdateSettings(value.autoUpdate),
  };
};

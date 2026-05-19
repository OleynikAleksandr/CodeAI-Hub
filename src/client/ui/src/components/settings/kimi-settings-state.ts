import { DEFAULT_KIMI_MODEL_ID } from "../../../../../types/kimi-model-registry";
import type {
  RawAutoUpdateSettings,
  RawKimiClaudeCodeSettings,
  RawKimiSettings,
} from "./settings-state-raw";

interface AutoUpdateSettings {
  readonly enabled: boolean;
}

export interface KimiSettings {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: typeof DEFAULT_KIMI_MODEL_ID;
  readonly thinkingDisplaySyncEnabled: boolean;
}

export interface KimiClaudeCodeSettings {
  readonly defaultModel: typeof DEFAULT_KIMI_MODEL_ID;
  readonly thinkingDisplaySyncEnabled: boolean;
}

export const mapKimiSettings = (
  value: RawKimiSettings | undefined,
  mapAutoUpdateSettings: (
    value: RawAutoUpdateSettings | undefined
  ) => AutoUpdateSettings,
  mapThinkingDisplaySyncEnabled: (value: unknown) => boolean
): KimiSettings => ({
  autoUpdate: mapAutoUpdateSettings(value?.autoUpdate),
  defaultModel: DEFAULT_KIMI_MODEL_ID,
  thinkingDisplaySyncEnabled: mapThinkingDisplaySyncEnabled(
    value?.thinkingDisplaySyncEnabled
  ),
});

export const mapKimiClaudeCodeSettings = (
  value: RawKimiClaudeCodeSettings | undefined,
  mapThinkingDisplaySyncEnabled: (value: unknown) => boolean
): KimiClaudeCodeSettings => ({
  defaultModel: DEFAULT_KIMI_MODEL_ID,
  thinkingDisplaySyncEnabled: mapThinkingDisplaySyncEnabled(
    value?.thinkingDisplaySyncEnabled
  ),
});

export const areKimiProviderSettingsEqual = (
  left: KimiSettings | KimiClaudeCodeSettings | undefined,
  right: KimiSettings | KimiClaudeCodeSettings | undefined
): boolean => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

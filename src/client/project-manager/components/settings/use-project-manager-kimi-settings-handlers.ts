import { useCallback } from "react";
import type { KimiModelId } from "../../../../types/kimi-model-registry";
import type { Settings } from "../../../ui/src/components/settings/settings-state-model";
import {
  updateKimiDefaultModel,
  updateThinkingDisplaySyncEnabled,
} from "../../../ui/src/components/settings/settings-state-helpers";

interface KimiSettingsHandlersInput {
  readonly settings: Settings;
  readonly updateSettings: (nextSettings: Settings) => void;
}

export const useProjectManagerKimiSettingsHandlers = ({
  settings,
  updateSettings,
}: KimiSettingsHandlersInput) => {
  const handleKimiDefaultModelChange = useCallback(
    (defaultModel: KimiModelId) => {
      updateSettings(updateKimiDefaultModel(settings, defaultModel));
    },
    [settings, updateSettings]
  );
  const handleKimiThinkingDisplaySyncChange = useCallback(
    (enabled: boolean) => {
      updateSettings(updateThinkingDisplaySyncEnabled(settings, "kimi", enabled));
    },
    [settings, updateSettings]
  );
  const handleKimiClaudeCodeThinkingDisplaySyncChange = useCallback(
    (enabled: boolean) => {
      updateSettings(
        updateThinkingDisplaySyncEnabled(settings, "kimiClaudeCode", enabled)
      );
    },
    [settings, updateSettings]
  );

  return {
    handleKimiClaudeCodeThinkingDisplaySyncChange,
    handleKimiDefaultModelChange,
    handleKimiThinkingDisplaySyncChange,
  };
};

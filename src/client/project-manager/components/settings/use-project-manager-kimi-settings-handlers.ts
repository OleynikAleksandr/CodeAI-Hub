import { useCallback } from "react";
import type { KimiModelId } from "../../../../types/kimi-model-registry";
import type { GlmOpenCodeSettings } from "../../../ui/src/components/settings/kimi-settings-state";
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
  const handleGlmOpenCodeThinkingDisplaySyncChange = useCallback(
    (enabled: boolean) => {
      updateSettings(
        updateThinkingDisplaySyncEnabled(settings, "glmOpenCode", enabled)
      );
    },
    [settings, updateSettings]
  );
  const handleGlmOpenCodeSettingsChange = useCallback(
    (glmOpenCode: GlmOpenCodeSettings) => {
      updateSettings({
        ...settings,
        providers: { ...settings.providers, glmOpenCode },
      });
    },
    [settings, updateSettings]
  );

  return {
    handleGlmOpenCodeSettingsChange,
    handleGlmOpenCodeThinkingDisplaySyncChange,
    handleKimiDefaultModelChange,
    handleKimiThinkingDisplaySyncChange,
  };
};

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../types/claude-model-registry";
import type {
  GeminiModelId,
  GeminiThinkingLevel,
} from "../../../../types/gemini-model-registry";
import type {
  UseSettingsStateResult,
  CoreControlState,
  LocalizationCategoryKey,
  LocalizationWorkflowTermsPolicy,
} from "../../../ui/src/components/settings/use-settings-state-support";
import {
  clampGeminiContextWindowTokenLimit,
  clampRemainingPercentThreshold,
  normalizeLoadedLocalizationSettings,
  normalizeLocalizationEngineId,
  updateLocalizationCategorySelection,
  updateLocalizationDefaultLanguageSelection,
} from "../../../ui/src/components/settings/use-settings-state-support";
import {
  areSettingsEqual,
  type CodexModelId,
  type CodexReasoningLevel,
  type GeneralResponseMode,
  type ProviderId,
  type Settings,
} from "../../../ui/src/components/settings/settings-state-model";
import {
  updateClaudeContinuityRemainingPercentThreshold,
  updateClaudeDefaultModel,
  updateCodexContinuityRemainingPercentThreshold,
  updateCodexDefaultModel,
  updateCodexReasoning,
  updateGeminiContextWindowTokenLimit,
  updateGeminiContinuityRemainingPercentThreshold,
  updateGeminiDefaultModel,
  updateGeminiThinking,
  updateProviderAutoUpdate,
  updateResponsePolicyMode,
  updateStrictInstructionText,
  updateStrictSchemaText,
  updateThinkingDisplaySyncEnabled,
  updateThinkingSettings,
} from "../../../ui/src/components/settings/settings-state-helpers";
import { openProjectManagerFileLink } from "../../services/project-manager-file-link-opener";
import { api } from "../../api";
import { useProjectManagerSettings } from "./use-project-manager-settings";

const PM_CORE_CONTROL_STATE: CoreControlState = {
  busy: false,
  message: null,
  phase: "idle",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCoreControlStatusPayload = (
  payload: unknown
): payload is CoreControlState => {
  if (!isRecord(payload)) {
    return false;
  }

  return (
    typeof payload.busy === "boolean" &&
    (payload.message === null || typeof payload.message === "string") &&
    (payload.phase === "stopping" ||
      payload.phase === "waiting" ||
      payload.phase === "starting" ||
      payload.phase === "ready" ||
      payload.phase === "error")
  );
};

export type UseProjectManagerSettingsStateResult = UseSettingsStateResult & {
  readonly hostPostMessage: (message: unknown) => void;
  readonly supportsCoreRestart: false;
};

export const useProjectManagerSettingsState =
  (): UseProjectManagerSettingsStateResult => {
    const transport = useProjectManagerSettings();
    const initialSettingsRef = useRef<Settings>(
      normalizeLoadedLocalizationSettings(transport.settings)
    );
    const lastOpenedGlossaryPathRef = useRef<string | null>(null);
    const [settings, setSettings] = useState<Settings>(() =>
      normalizeLoadedLocalizationSettings(transport.settings)
    );
    const [hasChanges, setHasChanges] = useState(false);
    const [coreControl, setCoreControl] = useState<CoreControlState>(
      PM_CORE_CONTROL_STATE
    );

    useEffect(() => {
      const nextSettings = normalizeLoadedLocalizationSettings(
        transport.settings
      );
      initialSettingsRef.current = nextSettings;
      setSettings(nextSettings);
      setHasChanges(false);
    }, [transport.settings]);

    useEffect(() => {
      const payload = transport.userGlossaryFile;
      const glossaryPath = payload?.path ?? null;
      if (!glossaryPath) {
        lastOpenedGlossaryPathRef.current = null;
        if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
          console.warn(
            "[ProjectManagerSettings] Failed to open user glossary file",
            payload.error
          );
        }
        return;
      }
      if (glossaryPath === lastOpenedGlossaryPathRef.current) {
        return;
      }
      lastOpenedGlossaryPathRef.current = glossaryPath;
      openProjectManagerFileLink({
        column: null,
        filePath: glossaryPath,
        href: glossaryPath,
        line: null,
      });
    }, [transport.userGlossaryFile]);

    useEffect(() => {
      const unsubscribe = api.onCoreEvent((message) => {
        if (
          message.type !== "settings:core-control-status" ||
          !isCoreControlStatusPayload(message.payload)
        ) {
          return;
        }
        setCoreControl(message.payload);
      });

      return () => {
        unsubscribe();
      };
    }, []);

    const updateSettings = useCallback((nextSettings: Settings) => {
      const normalizedSettings =
        normalizeLoadedLocalizationSettings(nextSettings);
      setSettings(normalizedSettings);
      setHasChanges(
        !areSettingsEqual(normalizedSettings, initialSettingsRef.current)
      );
    }, []);

    const handleThinkingSettingsChange = useCallback(
      (enabled: boolean, effort: ClaudeThinkingEffort) => {
        updateSettings(updateThinkingSettings(settings, enabled, effort));
      },
      [settings, updateSettings]
    );

    const handleClaudeDefaultModelChange = useCallback(
      (modelId: ClaudeModelAliasId) => {
        updateSettings(updateClaudeDefaultModel(settings, modelId));
      },
      [settings, updateSettings]
    );

    const handleClaudeContinuityRemainingPercentThresholdChange = useCallback(
      (remainingPercentThreshold: number) => {
        if (!Number.isFinite(remainingPercentThreshold)) {
          return;
        }
        const clamped = clampRemainingPercentThreshold(
          remainingPercentThreshold
        );
        updateSettings(
          updateClaudeContinuityRemainingPercentThreshold(settings, clamped)
        );
      },
      [settings, updateSettings]
    );

    const handleCodexContinuityRemainingPercentThresholdChange = useCallback(
      (remainingPercentThreshold: number) => {
        if (!Number.isFinite(remainingPercentThreshold)) {
          return;
        }
        const clamped = clampRemainingPercentThreshold(
          remainingPercentThreshold
        );
        updateSettings(
          updateCodexContinuityRemainingPercentThreshold(settings, clamped)
        );
      },
      [settings, updateSettings]
    );

    const handleGeminiContinuityRemainingPercentThresholdChange = useCallback(
      (remainingPercentThreshold: number) => {
        if (!Number.isFinite(remainingPercentThreshold)) {
          return;
        }
        const clamped = clampRemainingPercentThreshold(
          remainingPercentThreshold
        );
        updateSettings(
          updateGeminiContinuityRemainingPercentThreshold(settings, clamped)
        );
      },
      [settings, updateSettings]
    );

    const handleGeminiContextWindowTokenLimitChange = useCallback(
      (contextWindowTokenLimit: number) => {
        if (!Number.isFinite(contextWindowTokenLimit)) {
          return;
        }
        const clamped = clampGeminiContextWindowTokenLimit(
          contextWindowTokenLimit
        );
        updateSettings(updateGeminiContextWindowTokenLimit(settings, clamped));
      },
      [settings, updateSettings]
    );

    const handleCodexDefaultModelChange = useCallback(
      (modelId: CodexModelId) => {
        updateSettings(updateCodexDefaultModel(settings, modelId));
      },
      [settings, updateSettings]
    );

    const handleCodexReasoningChange = useCallback(
      (modelId: CodexModelId, reasoning: CodexReasoningLevel) => {
        updateSettings(updateCodexReasoning(settings, modelId, reasoning));
      },
      [settings, updateSettings]
    );

    const handleProviderAutoUpdateChange = useCallback(
      (provider: ProviderId, enabled: boolean) => {
        updateSettings(updateProviderAutoUpdate(settings, provider, enabled));
      },
      [settings, updateSettings]
    );

    const handleLocalizationDefaultLanguageChange = useCallback(
      (defaultLanguage: string) => {
        updateSettings(
          updateLocalizationDefaultLanguageSelection(settings, defaultLanguage)
        );
      },
      [settings, updateSettings]
    );

    const handleLocalizationCategoryLanguageChange = useCallback(
      (category: LocalizationCategoryKey, language: string) => {
        updateSettings(
          updateLocalizationCategorySelection(settings, category, language)
        );
      },
      [settings, updateSettings]
    );

    const handleLocalizationWorkflowTermsPolicyChange = useCallback(
      (_workflowTermsPolicy: LocalizationWorkflowTermsPolicy) => {
        updateSettings(normalizeLoadedLocalizationSettings(settings));
      },
      [settings, updateSettings]
    );

    const handleLocalizationEngineIdChange = useCallback(
      (engineId: string) => {
        const normalizedEngineId = normalizeLocalizationEngineId(engineId);
        updateSettings({
          ...settings,
          general: {
            ...settings.general,
            localization: {
              ...settings.general.localization,
              engineId: normalizedEngineId,
            },
          },
        });
      },
      [settings, updateSettings]
    );

    const handleReasoningTranslationEngineIdChange = useCallback(
      (engineId: string) => {
        const normalizedEngineId = normalizeLocalizationEngineId(engineId);
        updateSettings({
          ...settings,
          general: {
            ...settings.general,
            localization: {
              ...settings.general.localization,
              reasoningEngineId: normalizedEngineId,
            },
          },
        });
      },
      [settings, updateSettings]
    );

    const handleLocalizationGlossaryEnabledChange = useCallback(
      (enabled: boolean) => {
        updateSettings({
          ...settings,
          general: {
            ...settings.general,
            localization: {
              ...settings.general.localization,
              glossaryEnabled: enabled,
            },
          },
        });
      },
      [settings, updateSettings]
    );

    const handleResponsePolicyModeChange = useCallback(
      (mode: GeneralResponseMode) => {
        updateSettings(updateResponsePolicyMode(settings, mode));
      },
      [settings, updateSettings]
    );

    const handleStrictSchemaTextChange = useCallback(
      (value: string) => {
        updateSettings(updateStrictSchemaText(settings, value));
      },
      [settings, updateSettings]
    );

    const handleStrictInstructionTextChange = useCallback(
      (value: string) => {
        updateSettings(updateStrictInstructionText(settings, value));
      },
      [settings, updateSettings]
    );

    const handleGeminiDefaultModelChange = useCallback(
      (modelId: GeminiModelId) => {
        updateSettings(updateGeminiDefaultModel(settings, modelId));
      },
      [settings, updateSettings]
    );

    const handleGeminiThinkingChange = useCallback(
      (modelId: GeminiModelId, level: GeminiThinkingLevel) => {
        updateSettings(updateGeminiThinking(settings, modelId, level));
      },
      [settings, updateSettings]
    );

    const handleClaudeThinkingDisplaySyncChange = useCallback(
      (enabled: boolean) => {
        updateSettings(
          updateThinkingDisplaySyncEnabled(settings, "claude", enabled)
        );
      },
      [settings, updateSettings]
    );

    const handleCodexThinkingDisplaySyncChange = useCallback(
      (enabled: boolean) => {
        updateSettings(
          updateThinkingDisplaySyncEnabled(settings, "codex", enabled)
        );
      },
      [settings, updateSettings]
    );

    const handleGeminiThinkingDisplaySyncChange = useCallback(
      (enabled: boolean) => {
        updateSettings(
          updateThinkingDisplaySyncEnabled(settings, "gemini", enabled)
        );
      },
      [settings, updateSettings]
    );

    const handleSave = useCallback(() => {
      transport.save(settings);
    }, [settings, transport]);

    const handleReset = useCallback(() => {
      transport.reset();
    }, [transport]);

    const handleUpdateProvider = useCallback(
      (provider: ProviderId, target: "cli" | "sdk" | "core") => {
        transport.updateProvider(provider, target);
      },
      [transport]
    );

    const handleHostMessage = useCallback(
      (message: unknown) => {
        if (!isRecord(message) || typeof message.type !== "string") {
          return;
        }
        if (message.type === "settings:open-user-glossary-file") {
          transport.openUserGlossaryFile();
        }
      },
      [transport]
    );

    const handleRestartCore = useCallback(() => {
      api.restartCore();
    }, []);

    return {
      coreControl,
      settings,
      hasChanges,
      localizationRuntime: transport.localizationRuntime,
      saving: transport.saving,
      resetting: transport.resetting,
      versions: transport.versions,
      handleThinkingSettingsChange,
      handleClaudeContinuityRemainingPercentThresholdChange,
      handleCodexContinuityRemainingPercentThresholdChange,
      handleGeminiContinuityRemainingPercentThresholdChange,
      handleGeminiContextWindowTokenLimitChange,
      handleClaudeDefaultModelChange,
      handleCodexDefaultModelChange,
      handleGeminiDefaultModelChange,
      handleGeminiThinkingChange,
      handleClaudeThinkingDisplaySyncChange,
      handleCodexReasoningChange,
      handleCodexThinkingDisplaySyncChange,
      handleGeminiThinkingDisplaySyncChange,
      handleLocalizationCategoryLanguageChange,
      handleLocalizationDefaultLanguageChange,
      handleLocalizationEngineIdChange,
      handleLocalizationGlossaryEnabledChange,
      handleLocalizationWorkflowTermsPolicyChange,
      handleReasoningTranslationEngineIdChange,
      handleProviderAutoUpdateChange,
      handleRestartCore,
      handleResponsePolicyModeChange,
      handleStrictSchemaTextChange,
      handleStrictInstructionTextChange,
      handleSave,
      handleReset,
      handleUpdateProvider,
      hostPostMessage: handleHostMessage,
      supportsCoreRestart: false,
    };
  };

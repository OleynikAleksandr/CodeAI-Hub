import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../../types/claude-model-registry";
import type {
  CodexModelId,
  CodexReasoningLevel,
} from "../../../../../types/codex-model-registry";
import type {
  GeminiModelId,
  GeminiThinkingLevel,
} from "../../../../../types/gemini-model-registry";
import { readBrowserLocalizationBootstrapSnapshot } from "../../app-host/localization-runtime-contract";
import { createBootstrapSettings } from "../../shared-hooks/use-bootstrap-settings";
import vscode from "../../vscode";
import type { GeneralResponseMode } from "./general-response-mode/response-mode-state";
import { startBrowserNativeRequestCapture } from "./native-request-capture-browser-runner";
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
  updateLocalModelsDefaultModel,
  updateProviderAutoUpdate,
  updateResponsePolicyMode,
  updateStrictInstructionText,
  updateStrictSchemaText,
  updateTextToSpeechRate,
  updateThinkingDisplaySyncEnabled,
  updateThinkingSettings,
} from "./settings-state-helpers";
import {
  areSettingsEqual,
  mapSettingsSnapshot,
  type ProviderId,
  type Settings,
} from "./settings-state-model";
import {
  type CoreControlState,
  clampGeminiContextWindowTokenLimit,
  clampRemainingPercentThreshold,
  completeNativeRequestCapture,
  createNativeRequestCaptureState,
  isIncomingMessage,
  isSettingsSaveErrorMessage,
  type LocalizationCategoryKey,
  type LocalizationSyncStatusState,
  type LocalizationWorkflowTermsPolicy,
  type NativeRequestCaptureModelId,
  type NativeRequestCaptureProviderId,
  type NativeRequestCaptureScenarioId,
  type NativeRequestCaptureState,
  normalizeLoadedLocalizationSettings,
  type UseSettingsStateResult,
  updateLocalizationCategorySelection,
  updateLocalizationDefaultLanguageSelection,
  updateLocalizationEngineSelection,
  updateLocalizationGlossaryEnabledSelection,
  updateReasoningTranslationEngineSelection,
  type VersionsState,
} from "./use-settings-state-support";

export const LOCALIZATION_GLOSSARY_DRAFT_STORAGE_KEY =
  "codeaihub:settings:localization:user-glossary-draft";
export type { UseSettingsStateResult } from "./use-settings-state-support";

export const useSettingsState = (): UseSettingsStateResult => {
  const bootstrapSnapshot = readBrowserLocalizationBootstrapSnapshot();
  const initialSettingsRef = useRef<Settings>(
    createBootstrapSettings(bootstrapSnapshot)
  );
  const [settings, setSettings] = useState<Settings>(() =>
    createBootstrapSettings(bootstrapSnapshot)
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [localizationRuntime, setLocalizationRuntime] = useState(
    bootstrapSnapshot?.runtimePayload ?? null
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [coreControl, setCoreControl] = useState<CoreControlState>({
    busy: false,
    message: null,
    phase: "idle",
  });
  const [localizationSyncStatus, setLocalizationSyncStatus] =
    useState<LocalizationSyncStatusState>({
      busy: false,
      message: null,
    });
  const [nativeRequestCapture, setNativeRequestCapture] =
    useState<NativeRequestCaptureState>(createNativeRequestCaptureState);
  const [versions, setVersions] = useState<VersionsState>(() => ({
    data: null,
    loading: true,
    error: null,
    updatingTargets: [],
  }));

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (isSettingsSaveErrorMessage(event.data)) {
        setSaving(false);
        return;
      }

      if (!isIncomingMessage(event.data)) {
        return;
      }

      switch (event.data.type) {
        case "settings:loaded": {
          const nextSettings = normalizeLoadedLocalizationSettings(
            mapSettingsSnapshot(event.data.settings)
          );
          initialSettingsRef.current = nextSettings;
          setLocalizationRuntime(
            (current) => event.data.localizationRuntime ?? current
          );
          setSettings(nextSettings);
          setSaving(false);
          setResetting(false);
          setHasChanges(false);
          return;
        }
        case "settings:saved": {
          const nextSettings = normalizeLoadedLocalizationSettings(
            mapSettingsSnapshot(event.data.settings)
          );
          initialSettingsRef.current = nextSettings;
          setLocalizationRuntime(
            (current) => event.data.localizationRuntime ?? current
          );
          setSettings(nextSettings);
          setSaving(false);
          setHasChanges(false);
          return;
        }
        case "settings:versions": {
          const incomingVersions = event.data.versions ?? null;
          setVersions({
            data: incomingVersions,
            loading: false,
            error: event.data.error ?? null,
            updatingTargets: [],
          });
          return;
        }
        case "settings:core-control-status": {
          setCoreControl({
            busy: event.data.busy,
            message: event.data.message ?? null,
            phase: event.data.phase,
          });
          return;
        }
        case "settings:localization-sync-status": {
          setLocalizationSyncStatus({
            busy: event.data.busy,
            message: event.data.message ?? null,
          });
          return;
        }
        case "settings:native-request-capture:result": {
          setNativeRequestCapture(completeNativeRequestCapture(event.data));
          return;
        }
        default: {
          return;
        }
      }
    };

    window.addEventListener("message", handleMessage);
    vscode.postMessage({ type: "settings:load" });
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const updateSettings = useCallback((nextSettings: Settings) => {
    setSettings(nextSettings);
    setHasChanges(!areSettingsEqual(nextSettings, initialSettingsRef.current));
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
      const clamped = clampRemainingPercentThreshold(remainingPercentThreshold);
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
      const clamped = clampRemainingPercentThreshold(remainingPercentThreshold);
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
      const clamped = clampRemainingPercentThreshold(remainingPercentThreshold);
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
      updateSettings(updateLocalizationEngineSelection(settings, engineId));
    },
    [settings, updateSettings]
  );

  const handleReasoningTranslationEngineIdChange = useCallback(
    (engineId: string) => {
      updateSettings(
        updateReasoningTranslationEngineSelection(settings, engineId)
      );
    },
    [settings, updateSettings]
  );

  const handleLocalizationGlossaryEnabledChange = useCallback(
    (enabled: boolean) => {
      updateSettings(
        updateLocalizationGlossaryEnabledSelection(settings, enabled)
      );
    },
    [settings, updateSettings]
  );

  const handleResponsePolicyModeChange = useCallback(
    (mode: GeneralResponseMode) => {
      updateSettings(updateResponsePolicyMode(settings, mode));
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
      vscode.postMessage({
        type: "settings:codex-reasoning-summary-preview",
        enabled,
      });
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

  const handleUpdateProvider = useCallback(
    (provider: ProviderId, target: "cli" | "sdk" | "core") => {
      const targetKey = `${provider}:${target}`;
      setVersions((prev) => ({
        ...prev,
        updatingTargets: [...new Set([...prev.updatingTargets, targetKey])],
      }));
      vscode.postMessage({
        type: "settings:update-provider",
        provider,
        target,
      });
    },
    []
  );

  const handleRestartCore = useCallback(() => {
    setCoreControl({
      busy: true,
      message: "Restart requested. Preparing shutdown...",
      phase: "stopping",
    });
    vscode.postMessage({ type: "core:restart-request" });
  }, []);

  const handleNativeRequestCapture = useCallback(
    (
      providerId: NativeRequestCaptureProviderId,
      modelId: NativeRequestCaptureModelId,
      scenarioId: NativeRequestCaptureScenarioId
    ) => {
      startBrowserNativeRequestCapture({
        modelId,
        providerId,
        scenarioId,
        setNativeRequestCapture,
      });
    },
    []
  );
  return {
    coreControl,
    settings,
    hasChanges,
    localizationSyncStatus,
    localizationRuntime,
    nativeRequestCapture,
    saving,
    resetting,
    versions,
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
    handleGlmOpenCodeSettingsChange: (glmOpenCode) =>
      updateSettings({
        ...settings,
        providers: { ...settings.providers, glmOpenCode },
      }),
    handleGlmOpenCodeThinkingDisplaySyncChange: (enabled) =>
      updateSettings(
        updateThinkingDisplaySyncEnabled(settings, "glmOpenCode", enabled)
      ),
    handleGlmNativeSettingsChange: (glmNative) =>
      updateSettings({
        ...settings,
        providers: { ...settings.providers, glmNative },
      }),
    handleGlmNativeThinkingDisplaySyncChange: (enabled) =>
      updateSettings(
        updateThinkingDisplaySyncEnabled(settings, "glmNative", enabled)
      ),
    handleLocalizationCategoryLanguageChange,
    handleLocalizationDefaultLanguageChange,
    handleLocalizationEngineIdChange,
    handleLocalizationGlossaryEnabledChange,
    handleLocalizationWorkflowTermsPolicyChange,
    handleLocalModelsDefaultModelChange: (modelId) =>
      updateSettings(updateLocalModelsDefaultModel(settings, modelId)),
    handleOpenRouterSettingsChange: (openRouter) =>
      updateSettings({
        ...settings,
        providers: { ...settings.providers, openRouter },
      }),
    handleNativeRequestCapture,
    handleReasoningTranslationEngineIdChange,
    handleProviderAutoUpdateChange,
    handleRestartCore,
    handleResponsePolicyModeChange,
    handleStrictSchemaTextChange: (value) =>
      updateSettings(updateStrictSchemaText(settings, value)),
    handleStrictInstructionTextChange: (value) =>
      updateSettings(updateStrictInstructionText(settings, value)),
    handleTextToSpeechRateChange: (rate) =>
      updateSettings(updateTextToSpeechRate(settings, rate)),
    handleSave: () => {
      setSaving(true);
      vscode.postMessage({ type: "settings:save", settings });
    },
    handleReset: () => {
      setResetting(true);
      window.setTimeout(() => {
        vscode.postMessage({ type: "settings:reset" });
      }, 100);
    },
    handleUpdateProvider,
  };
};

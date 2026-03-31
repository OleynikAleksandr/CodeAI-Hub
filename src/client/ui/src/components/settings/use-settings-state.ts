import { useCallback, useEffect, useRef, useState } from "react";
import type { ClaudeModelAliasId } from "../../../../../types/claude-model-registry";
import type {
  GeminiModelId,
  GeminiThinkingLevel,
} from "../../../../../types/gemini-model-registry";
import vscode from "../../vscode";
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
} from "./settings-state-helpers";
import {
  areSettingsEqual,
  type CodexModelId,
  type CodexReasoningLevel,
  createDefaultSettings,
  type GeneralResponseMode,
  mapSettingsSnapshot,
  type ProviderId,
  type Settings,
} from "./settings-state-model";
import {
  clampGeminiContextWindowTokenLimit,
  clampRemainingPercentThreshold,
  isIncomingMessage,
  type UseSettingsStateResult,
  type VersionsState,
} from "./use-settings-state-support";

const RESET_DELAY_MS = 100;

export type { UseSettingsStateResult } from "./use-settings-state-support";

export const useSettingsState = (): UseSettingsStateResult => {
  const initialSettingsRef = useRef<Settings>(createDefaultSettings());
  const [settings, setSettings] = useState<Settings>(createDefaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [versions, setVersions] = useState<VersionsState>(() => ({
    data: null,
    loading: true,
    error: null,
    updatingTargets: [],
  }));

  useEffect(() => {
    vscode.postMessage({
      type: "settings:load",
    });

    const handleMessage = (event: MessageEvent) => {
      if (!isIncomingMessage(event.data)) {
        return;
      }

      if (event.data.type === "settings:loaded") {
        const nextSettings = mapSettingsSnapshot(event.data.settings);
        initialSettingsRef.current = nextSettings;
        setSettings(nextSettings);
        setResetting(false);
        setHasChanges(false);
      }

      if (event.data.type === "settings:saved") {
        const nextSettings = mapSettingsSnapshot(event.data.settings);
        initialSettingsRef.current = nextSettings;
        setSettings(nextSettings);
        setSaving(false);
        setHasChanges(false);
      }

      if (event.data.type === "settings:versions") {
        const incomingVersions = event.data.versions ?? null;
        setVersions({
          data: incomingVersions,
          loading: false,
          error: event.data.error ?? null,
          updatingTargets: [],
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const updateSettings = useCallback((nextSettings: Settings) => {
    setSettings(nextSettings);
    setHasChanges(!areSettingsEqual(nextSettings, initialSettingsRef.current));
  }, []);

  const handleThinkingSettingsChange = useCallback(
    (enabled: boolean, maxTokens: number) => {
      updateSettings(updateThinkingSettings(settings, enabled, maxTokens));
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
    setSaving(true);
    vscode.postMessage({
      type: "settings:save",
      settings,
    });
  }, [settings]);

  const handleReset = useCallback(() => {
    setResetting(true);
    window.setTimeout(() => {
      vscode.postMessage({
        type: "settings:reset",
      });
    }, RESET_DELAY_MS);
  }, []);

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

  return {
    settings,
    hasChanges,
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
    handleCodexReasoningChange,
    handleCodexThinkingDisplaySyncChange,
    handleGeminiThinkingDisplaySyncChange,
    handleProviderAutoUpdateChange,
    handleResponsePolicyModeChange,
    handleStrictSchemaTextChange,
    handleStrictInstructionTextChange,
    handleSave,
    handleReset,
    handleUpdateProvider,
  };
};

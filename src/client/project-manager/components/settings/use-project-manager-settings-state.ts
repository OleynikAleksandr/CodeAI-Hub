import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../types/claude-model-registry";
import type {
  CodexModelId,
  CodexReasoningLevel,
} from "../../../../types/codex-model-registry";
import type { KimiModelId } from "../../../../types/kimi-model-registry";
import type { GeneralResponseMode } from "../../../ui/src/components/settings/general-response-mode/response-mode-state";
import type {
  UseSettingsStateResult,
  CoreControlState,
  LocalizationCategoryKey,
  LocalizationWorkflowTermsPolicy,
  NativeRequestCaptureProviderId,
  NativeRequestCaptureModelId,
  NativeRequestCaptureScenarioId,
  NativeRequestCaptureState,
} from "../../../ui/src/components/settings/use-settings-state-support";
import type { TemplateUpdateSettingsControls } from "../../../ui/src/components/settings/template-update-settings-model";
import {
  clampRemainingPercentThreshold,
  completeNativeRequestCapture,
  createNativeRequestCaptureState,
  normalizeLoadedLocalizationSettings,
  updateLocalizationCategorySelection,
  updateLocalizationDefaultLanguageSelection,
  updateLocalizationEngineSelection,
  updateLocalizationGlossaryEnabledSelection,
  updateReasoningTranslationEngineSelection,
} from "../../../ui/src/components/settings/use-settings-state-support";
import {
  areSettingsEqual,
  type ProviderId,
  type Settings,
} from "../../../ui/src/components/settings/settings-state-model";
import {
  updateClaudeContinuityRemainingPercentThreshold,
  updateClaudeDefaultModel,
  updateCodexContinuityRemainingPercentThreshold,
  updateCodexDefaultModel,
  updateCodexReasoning,
  updateLocalModelsDefaultModel,
  updateProviderAutoUpdate,
  updateResponsePolicyMode,
  updateStrictInstructionText,
  updateStrictSchemaText,
  updateTextToSpeechRate,
  updateThinkingDisplaySyncEnabled,
  updateThinkingSettings,
} from "../../../ui/src/components/settings/settings-state-helpers";
import { openCaptureWorkbench } from "../../services/capture-workbench-launcher";
import { openProjectManagerFileLink } from "../../services/project-manager-file-link-opener";
import { api } from "../../api";
import type { SettingsNativeRequestCaptureResultPayload } from "../../core-stream-message-types";
import {
  handleProjectManagerSettingsHostMessage,
  isNativeRequestCaptureProviderId,
} from "./project-manager-settings-host-message";
import { startProjectManagerNativeRequestCapture } from "./native-request-capture-runner";
import { useProjectManagerKimiSettingsHandlers } from "./use-project-manager-kimi-settings-handlers";
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

const isNativeRequestCaptureResultPayload = (
  payload: unknown
): payload is SettingsNativeRequestCaptureResultPayload =>
  isRecord(payload) &&
  typeof payload.ok === "boolean" &&
  isNativeRequestCaptureProviderId(payload.providerId);

export type UseProjectManagerSettingsStateResult =
  UseSettingsStateResult &
    TemplateUpdateSettingsControls & {
      readonly handleKimiDefaultModelChange: (modelId: KimiModelId) => void;
      readonly handleKimiThinkingDisplaySyncChange: (enabled: boolean) => void;
      readonly handleKimiThinkingEnabledChange: (enabled: boolean) => void;
      readonly handleNativeRequestCaptureWorkbenchOpen: () => void;
      readonly hostPostMessage: (message: unknown) => void;
      readonly supportsCoreRestart: false;
    };

interface ProjectManagerSettingsContext {
  readonly activeWorkspaceName?: string;
  readonly activeWorkspacePath?: string;
  readonly activeWorkspaceSlug?: string | null;
}

export const useProjectManagerSettingsState =
  (
    context: ProjectManagerSettingsContext = {}
  ): UseProjectManagerSettingsStateResult => {
    const transport = useProjectManagerSettings({
      workspacePath: context.activeWorkspacePath,
      workspaceSlug: context.activeWorkspaceSlug,
    });
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
    const [nativeRequestCapture, setNativeRequestCapture] =
      useState<NativeRequestCaptureState>(createNativeRequestCaptureState);

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
        if (message.type === "settings:core-control-status") {
          if (isCoreControlStatusPayload(message.payload)) {
            setCoreControl(message.payload);
          }
          return;
        }
        if (message.type === "settings:native-request-capture:result") {
          if (isNativeRequestCaptureResultPayload(message.payload)) {
            setNativeRequestCapture(
              completeNativeRequestCapture({
                type: "settings:native-request-capture:result",
                ...message.payload,
              })
            );
          }
        }
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
    const {
      handleGlmOpenCodeSettingsChange,
      handleGlmOpenCodeThinkingDisplaySyncChange,
      handleGlmNativeSettingsChange,
      handleGlmNativeThinkingDisplaySyncChange,
      handleKimiDefaultModelChange,
      handleKimiThinkingDisplaySyncChange,
      handleKimiThinkingEnabledChange,
    } = useProjectManagerKimiSettingsHandlers({ settings, updateSettings });
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
    const handleNativeRequestCapture = useCallback(
      (
        providerId: NativeRequestCaptureProviderId,
        modelId: NativeRequestCaptureModelId,
        scenarioId: NativeRequestCaptureScenarioId
      ) => {
        startProjectManagerNativeRequestCapture({
          context,
          modelId,
          providerId,
          scenarioId,
          setNativeRequestCapture,
        });
      },
      [context]
    );

    const handleNativeRequestCaptureWorkbenchOpen = useCallback(() => {
      openCaptureWorkbench({
        workspacePath: context.activeWorkspacePath,
        workspaceSlug: context.activeWorkspaceSlug,
      });
    }, [context.activeWorkspacePath, context.activeWorkspaceSlug]);
    const handleHostMessage = useCallback(
      (message: unknown) => {
        handleProjectManagerSettingsHostMessage({
          handleNativeRequestCapture,
          message,
          settings,
          transport,
        });
      },
      [handleNativeRequestCapture, settings, transport]
    );
    return {
      coreControl,
      settings,
      hasChanges,
      localizationSyncStatus: transport.localizationSyncStatus,
      localizationRuntime: transport.localizationRuntime,
      nativeRequestCapture,
      saving: transport.saving,
      resetting: transport.resetting,
      versions: transport.versions,
      handleThinkingSettingsChange,
      handleClaudeContinuityRemainingPercentThresholdChange,
      handleCodexContinuityRemainingPercentThresholdChange,
      handleClaudeDefaultModelChange,
      handleCodexDefaultModelChange,
      handleKimiDefaultModelChange,
      handleGlmOpenCodeSettingsChange,
      handleGlmNativeSettingsChange,
      handleClaudeThinkingDisplaySyncChange,
      handleCodexReasoningChange,
      handleCodexThinkingDisplaySyncChange,
      handleGlmOpenCodeThinkingDisplaySyncChange,
      handleGlmNativeThinkingDisplaySyncChange,
      handleKimiThinkingDisplaySyncChange,
      handleKimiThinkingEnabledChange,
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
      handleNativeRequestCaptureWorkbenchOpen,
      handleReasoningTranslationEngineIdChange,
      handleProviderAutoUpdateChange,
      handleRestartCore: () => api.restartCore(),
      handleResponsePolicyModeChange,
      handleStrictSchemaTextChange: (value) =>
        updateSettings(updateStrictSchemaText(settings, value)),
      handleStrictInstructionTextChange: (value) =>
        updateSettings(updateStrictInstructionText(settings, value)),
      handleTextToSpeechRateChange: (rate) =>
        updateSettings(updateTextToSpeechRate(settings, rate)),
      handleSave: () => transport.save(settings),
      handleReset: transport.reset,
      handleUpdateProvider: transport.updateProvider,
      handleTemplateUpdateResolve: transport.resolveTemplateUpdate,
      handleTemplateUpdatesLoad: transport.loadTemplateUpdates,
      hostPostMessage: handleHostMessage,
      supportsCoreRestart: false,
      templateUpdates: transport.templateUpdates,
    };
  };

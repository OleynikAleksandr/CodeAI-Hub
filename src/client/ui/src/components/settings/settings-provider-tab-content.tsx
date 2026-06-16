import type React from "react";
import type { KimiModelId } from "../../../../../types/kimi-model-registry";
import { useLocalization } from "../../app-host/use-localization";
import ClaudeDefaultModelCard from "./claude-default-model/claude-default-model-card";
import CodexDefaultModelCard from "./codex-default-model/codex-default-model-card";
import GeminiDefaultModelCard from "./gemini-default-model/gemini-default-model-card";
import GeneralResponseModeFacade from "./general-response-mode/general-response-mode-facade";
import GeneralSettings from "./general-settings";
import GlmOpenCodeSettingsCard from "./glm-opencode-settings-card";
import type { GlmOpenCodeSettings } from "./kimi-settings-state";
import KimiSettingsTab from "./kimi-settings-tab";
import LocalizationSettingsCard from "./localization-settings-card";
import ProviderVersions from "./provider-versions";
import SessionContinuityCard from "./session-continuity-card";
import SettingsCard from "./settings-card";
import {
  descriptionStyles,
  listStyles,
  modelDescriptionStyles,
  modelInfoStyles,
  modelTitleStyles,
  rowBaseStyles,
  rowSelectedStyles,
} from "./shared-model-card-styles";
import { settingsSpacingTokens } from "./style-tokens";
import type { TemplateUpdateSettingsControls } from "./template-update-settings-model";
import TemplateUpdatesCard from "./template-updates-card";
import ThinkingSettings from "./thinking-settings";
import type { UseSettingsStateResult } from "./use-settings-state";

export type SettingsViewMode = "full" | "project-manager" | "settings-only";
type SettingsBooleanHandler = (enabled: boolean) => void;

export type SettingsViewState = UseSettingsStateResult & {
  readonly handleKimiDefaultModelChange?: (modelId: KimiModelId) => void;
  readonly handleGlmOpenCodeSettingsChange?: (
    settings: GlmOpenCodeSettings
  ) => void;
  readonly handleGlmOpenCodeThinkingDisplaySyncChange?: SettingsBooleanHandler;
  readonly handleKimiThinkingDisplaySyncChange?: SettingsBooleanHandler;
  readonly handleNativeRequestCaptureWorkbenchOpen?: () => void;
  readonly hostPostMessage?: (message: unknown) => void;
  readonly supportsCoreRestart?: boolean;
} & Partial<TemplateUpdateSettingsControls>;

export type SettingsTab =
  | "claude"
  | "codex"
  | "gemini"
  | "kimi"
  | "glmOpenCode"
  | "localModels"
  | "general";

const stackStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: settingsSpacingTokens.containerGap,
};

const localModelsMutedStyles: React.CSSProperties = {
  color: "#a8b3bf",
  fontSize: "12px",
  lineHeight: 1.5,
  margin: 0,
};

const LOCAL_MODEL_ENGINE_PREFIX = "lmstudio:";

const formatLocalModelName = (modelKey: string): string =>
  modelKey
    .split("/")
    .pop()
    ?.replace(/[-_]+/gu, " ")
    .replace(/\b\w/gu, (match) => match.toUpperCase()) ?? modelKey;

interface LocalModelsSettingsTabProps {
  readonly defaultModel?: string;
  readonly onDefaultModelChange?: (modelId: string) => void;
}

const LocalModelsSettingsTab: React.FC<LocalModelsSettingsTabProps> = ({
  defaultModel,
  onDefaultModelChange,
}) => {
  const { availableEngines } = useLocalization();
  const localModels = availableEngines
    .map((engine) => engine.engineId)
    .filter((engineId) => engineId.startsWith(LOCAL_MODEL_ENGINE_PREFIX))
    .map((engineId) => engineId.slice(LOCAL_MODEL_ENGINE_PREFIX.length));
  const selectedModel = localModels.includes(defaultModel ?? "")
    ? defaultModel
    : localModels[0];

  return (
    <div style={stackStyles}>
      <SettingsCard title="Local Models">
        <div style={listStyles}>
          <p style={descriptionStyles}>
            Select the default LM Studio model used for new Local Models
            sessions.
          </p>
          {localModels.length > 0 ? (
            localModels.map((modelKey) => (
              <button
                aria-pressed={modelKey === selectedModel}
                key={modelKey}
                onClick={() => onDefaultModelChange?.(modelKey)}
                style={{
                  ...rowBaseStyles,
                  border: "none",
                  textAlign: "left",
                  width: "100%",
                  ...(modelKey === selectedModel ? rowSelectedStyles : {}),
                }}
                type="button"
              >
                <div style={modelInfoStyles}>
                  <div style={modelTitleStyles}>
                    {formatLocalModelName(modelKey)}
                  </div>
                  <div style={modelDescriptionStyles}>lmstudio:{modelKey}</div>
                </div>
              </button>
            ))
          ) : (
            <p style={localModelsMutedStyles}>
              No downloaded LM Studio models are currently visible to Core.
            </p>
          )}
        </div>
      </SettingsCard>
    </div>
  );
};

export const settingsTabs: ReadonlyArray<{
  readonly id: SettingsTab;
  readonly label: string;
}> = [
  { id: "claude", label: "Claude" },
  { id: "codex", label: "Codex" },
  { id: "gemini", label: "Gemini" },
  { id: "kimi", label: "Kimi" },
  { id: "glmOpenCode", label: "OpenCode" },
  { id: "localModels", label: "Local Models" },
  { id: "general", label: "General" },
];

interface SettingsProviderTabContentProps {
  readonly activeTab: SettingsTab;
  readonly mode: SettingsViewMode;
  readonly state: SettingsViewState;
}

export const SettingsProviderTabContent: React.FC<
  SettingsProviderTabContentProps
> = ({ activeTab, mode, state }) => {
  const {
    coreControl,
    settings,
    versions,
    handleThinkingSettingsChange,
    handleClaudeContinuityRemainingPercentThresholdChange,
    handleCodexContinuityRemainingPercentThresholdChange,
    handleGeminiContinuityRemainingPercentThresholdChange,
    handleGeminiContextWindowTokenLimitChange,
    handleCodexDefaultModelChange,
    handleClaudeDefaultModelChange,
    handleGeminiDefaultModelChange,
    handleKimiDefaultModelChange,
    handleGlmOpenCodeSettingsChange,
    handleGlmOpenCodeThinkingDisplaySyncChange,
    handleGeminiThinkingChange,
    handleClaudeThinkingDisplaySyncChange,
    handleCodexThinkingDisplaySyncChange,
    handleGeminiThinkingDisplaySyncChange,
    handleKimiThinkingDisplaySyncChange,
    handleLocalizationCategoryLanguageChange,
    handleLocalizationDefaultLanguageChange,
    handleLocalizationEngineIdChange,
    handleLocalizationGlossaryEnabledChange,
    handleLocalizationWorkflowTermsPolicyChange,
    handleLocalModelsDefaultModelChange,
    handleNativeRequestCaptureWorkbenchOpen,
    handleReasoningTranslationEngineIdChange,
    handleCodexReasoningChange,
    handleProviderAutoUpdateChange,
    handleRestartCore,
    handleResponsePolicyModeChange,
    handleStrictSchemaTextChange,
    handleStrictInstructionTextChange,
    handleTextToSpeechRateChange,
    handleUpdateProvider,
  } = state;
  const renderProjectManagerGeneralTab =
    mode !== "project-manager" && state.supportsCoreRestart === false;
  const templateUpdateControls =
    state.templateUpdates &&
    state.handleTemplateUpdatesLoad &&
    state.handleTemplateUpdateResolve
      ? {
          handleTemplateUpdateResolve: state.handleTemplateUpdateResolve,
          handleTemplateUpdatesLoad: state.handleTemplateUpdatesLoad,
          templateUpdates: state.templateUpdates,
        }
      : null;

  if (activeTab === "claude") {
    return (
      <div style={stackStyles}>
        <ClaudeDefaultModelCard
          defaultModel={settings.providers.claude.defaultModel}
          onDefaultModelChange={handleClaudeDefaultModelChange}
        />
        <ProviderVersions
          autoUpdateEnabled={settings.providers.claude.autoUpdate.enabled}
          onAutoUpdateChange={handleProviderAutoUpdateChange}
          onUpdate={handleUpdateProvider}
          provider="claude"
          versions={versions}
        />
        <ThinkingSettings
          effort={settings.providers.claude.thinking.effort}
          enabled={settings.providers.claude.thinking.enabled}
          onChange={handleThinkingSettingsChange}
          onThinkingDisplaySyncChange={handleClaudeThinkingDisplaySyncChange}
          thinkingDisplaySyncEnabled={
            settings.providers.claude.thinkingDisplaySyncEnabled
          }
        />
        <SessionContinuityCard
          onRemainingPercentThresholdChange={
            handleClaudeContinuityRemainingPercentThresholdChange
          }
          remainingPercentThreshold={
            settings.providers.claude.sessionContinuity
              .remainingPercentThreshold
          }
          title="Claude Session Continuity"
        />
      </div>
    );
  }

  if (activeTab === "codex") {
    return (
      <div style={stackStyles}>
        <CodexDefaultModelCard
          defaultModel={settings.providers.codex.defaultModel}
          onDefaultModelChange={handleCodexDefaultModelChange}
          onReasoningChange={handleCodexReasoningChange}
          onReasoningSummaryEnabledChange={handleCodexThinkingDisplaySyncChange}
          reasoningByModel={settings.providers.codex.reasoningByModel}
          reasoningSummaryEnabled={
            settings.providers.codex.reasoningSummaryEnabled
          }
        />
        <ProviderVersions
          autoUpdateEnabled={settings.providers.codex.autoUpdate.enabled}
          onAutoUpdateChange={handleProviderAutoUpdateChange}
          onUpdate={handleUpdateProvider}
          provider="codex"
          versions={versions}
        />
        <SessionContinuityCard
          onRemainingPercentThresholdChange={
            handleCodexContinuityRemainingPercentThresholdChange
          }
          remainingPercentThreshold={
            settings.providers.codex.sessionContinuity.remainingPercentThreshold
          }
          title="Codex Session Continuity"
        />
      </div>
    );
  }

  if (activeTab === "kimi") {
    return (
      <KimiSettingsTab
        kimiDefaultModel={settings.providers.kimi?.defaultModel}
        kimiThinkingDisplaySyncEnabled={
          settings.providers.kimi?.thinkingDisplaySyncEnabled
        }
        onKimiDefaultModelChange={handleKimiDefaultModelChange}
        onKimiThinkingDisplaySyncChange={handleKimiThinkingDisplaySyncChange}
      />
    );
  }

  if (activeTab === "glmOpenCode") {
    return (
      <div style={stackStyles}>
        <GlmOpenCodeSettingsCard
          onSettingsChange={handleGlmOpenCodeSettingsChange}
          onThinkingDisplaySyncChange={
            handleGlmOpenCodeThinkingDisplaySyncChange
          }
          settings={settings.providers.glmOpenCode}
          thinkingDisplaySyncEnabled={
            settings.providers.glmOpenCode?.thinkingDisplaySyncEnabled
          }
        />
        <ProviderVersions
          autoUpdateEnabled={false}
          onAutoUpdateChange={handleProviderAutoUpdateChange}
          onUpdate={handleUpdateProvider}
          provider="glmOpenCode"
          versions={versions}
        />
      </div>
    );
  }

  if (activeTab === "localModels") {
    return (
      <LocalModelsSettingsTab
        defaultModel={settings.providers.localModels?.defaultModel}
        onDefaultModelChange={handleLocalModelsDefaultModelChange}
      />
    );
  }

  if (activeTab === "gemini") {
    return (
      <div style={stackStyles}>
        <GeminiDefaultModelCard
          defaultModel={settings.providers.gemini.defaultModel}
          onDefaultModelChange={handleGeminiDefaultModelChange}
          onThinkingChange={handleGeminiThinkingChange}
          onThinkingDisplaySyncChange={handleGeminiThinkingDisplaySyncChange}
          thinkingDisplaySyncEnabled={
            settings.providers.gemini.thinkingDisplaySyncEnabled
          }
          thinkingLevelByModel={settings.providers.gemini.thinkingLevelByModel}
        />
        <ProviderVersions
          autoUpdateEnabled={settings.providers.gemini.autoUpdate.enabled}
          onAutoUpdateChange={handleProviderAutoUpdateChange}
          onUpdate={handleUpdateProvider}
          provider="gemini"
          versions={versions}
        />
        <SessionContinuityCard
          contextWindowTokenLimit={
            settings.providers.gemini.sessionContinuity.contextWindowTokenLimit
          }
          onContextWindowTokenLimitChange={
            handleGeminiContextWindowTokenLimitChange
          }
          onRemainingPercentThresholdChange={
            handleGeminiContinuityRemainingPercentThresholdChange
          }
          remainingPercentThreshold={
            settings.providers.gemini.sessionContinuity
              .remainingPercentThreshold
          }
          title="Gemini Session Continuity"
        />
      </div>
    );
  }

  return (
    <div style={stackStyles}>
      {renderProjectManagerGeneralTab ? (
        <>
          <GeneralResponseModeFacade
            onModeChange={handleResponsePolicyModeChange}
            onStrictInstructionTextChange={handleStrictInstructionTextChange}
            onStrictSchemaTextChange={handleStrictSchemaTextChange}
            responsePolicy={settings.general.responsePolicy}
          />
          <LocalizationSettingsCard
            localization={settings.general.localization}
            onCategoryLanguageChange={handleLocalizationCategoryLanguageChange}
            onDefaultLanguageChange={handleLocalizationDefaultLanguageChange}
            onEngineIdChange={handleLocalizationEngineIdChange}
            onGlossaryEnabledChange={handleLocalizationGlossaryEnabledChange}
            onReasoningTranslationEngineIdChange={
              handleReasoningTranslationEngineIdChange
            }
            onWorkflowTermsPolicyChange={
              handleLocalizationWorkflowTermsPolicyChange
            }
          />
        </>
      ) : (
        <>
          <GeneralSettings
            coreControl={coreControl}
            localization={settings.general.localization}
            onLocalizationCategoryLanguageChange={
              handleLocalizationCategoryLanguageChange
            }
            onLocalizationDefaultLanguageChange={
              handleLocalizationDefaultLanguageChange
            }
            onLocalizationEngineIdChange={handleLocalizationEngineIdChange}
            onLocalizationGlossaryEnabledChange={
              handleLocalizationGlossaryEnabledChange
            }
            onLocalizationWorkflowTermsPolicyChange={
              handleLocalizationWorkflowTermsPolicyChange
            }
            onNativeRequestCaptureWorkbenchOpen={
              handleNativeRequestCaptureWorkbenchOpen
            }
            onReasoningTranslationEngineIdChange={
              handleReasoningTranslationEngineIdChange
            }
            onResponsePolicyModeChange={handleResponsePolicyModeChange}
            onRestartCore={handleRestartCore}
            onStrictInstructionTextChange={handleStrictInstructionTextChange}
            onStrictSchemaTextChange={handleStrictSchemaTextChange}
            onTextToSpeechRateChange={handleTextToSpeechRateChange}
            responsePolicy={settings.general.responsePolicy}
            textToSpeech={settings.general.textToSpeech}
          />
          {templateUpdateControls ? (
            <TemplateUpdatesCard
              onLoad={templateUpdateControls.handleTemplateUpdatesLoad}
              onResolve={templateUpdateControls.handleTemplateUpdateResolve}
              state={templateUpdateControls.templateUpdates}
            />
          ) : null}
        </>
      )}
    </div>
  );
};

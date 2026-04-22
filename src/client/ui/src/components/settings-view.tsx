import React, { useEffect, useState } from "react";
import { useLocalization } from "../app-host/use-localization";
import vscode from "../vscode";
import ClaudeDefaultModelCard from "./settings/claude-default-model/claude-default-model-card";
import CodexDefaultModelCard from "./settings/codex-default-model/codex-default-model-card";
import GeminiDefaultModelCard from "./settings/gemini-default-model/gemini-default-model-card";
import GeneralResponseModeFacade from "./settings/general-response-mode/general-response-mode-facade";
import GeneralSettings from "./settings/general-settings";
import LocalizationSettingsCard from "./settings/localization-settings-card";
import ProviderVersions from "./settings/provider-versions";
import SessionContinuityCard from "./settings/session-continuity-card";
import SettingsFooter from "./settings/settings-footer";
import SettingsHeader from "./settings/settings-header";
import {
  settingsColorTokens,
  settingsSpacingTokens,
  settingsTypographyTokens,
} from "./settings/style-tokens";
import ThinkingSettings from "./settings/thinking-settings";
import type { UseSettingsStateResult } from "./settings/use-settings-state";

type SettingsMode = "full" | "project-manager" | "settings-only";

type SettingsViewState = UseSettingsStateResult & {
  readonly hostPostMessage?: (message: unknown) => void;
  readonly supportsCoreRestart?: boolean;
};

interface SettingsViewProps {
  readonly mode?: SettingsMode;
  readonly onClose: () => void;
  readonly state: SettingsViewState;
}

type SettingsTab = "claude" | "codex" | "gemini" | "general";

const containerStyles: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  background: settingsColorTokens.surface,
  color: settingsColorTokens.textSecondary,
};

const tabBarStyles: React.CSSProperties = {
  display: "flex",
  borderBottom: `1px solid ${settingsColorTokens.borderSubtle}`,
  padding: `0 ${settingsSpacingTokens.pagePadding}`,
  gap: "8px",
};

const tabButtonStyles: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: settingsColorTokens.textSecondary,
  fontSize: settingsTypographyTokens.tabFontSize,
  padding: settingsSpacingTokens.tabPadding,
  cursor: "pointer",
  borderBottom: "2px solid transparent",
};

const activeTabStyles: React.CSSProperties = {
  color: settingsColorTokens.textPrimary,
  borderBottomColor: settingsColorTokens.actionPrimary,
};

const contentStyles: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: settingsSpacingTokens.pagePadding,
};

const stackStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: settingsSpacingTokens.containerGap,
};

const syncOverlayStyles: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(7, 10, 16, 0.7)",
  zIndex: 10,
  padding: settingsSpacingTokens.pagePadding,
};

const syncCardStyles: React.CSSProperties = {
  maxWidth: "520px",
  width: "100%",
  borderRadius: "14px",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  background: "rgba(18, 24, 34, 0.96)",
  boxShadow: "0 18px 48px rgba(0, 0, 0, 0.35)",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const syncSpinnerStyles: React.CSSProperties = {
  width: "30px",
  height: "30px",
  borderRadius: "999px",
  border: `3px solid ${settingsColorTokens.borderStrong}`,
  borderTopColor: settingsColorTokens.actionPrimary,
  animation: "settings-spin 0.9s linear infinite",
};

const syncTitleStyles: React.CSSProperties = {
  margin: 0,
  color: settingsColorTokens.textPrimary,
  fontSize: settingsTypographyTokens.titleFontSize,
  fontWeight: 700,
};

const syncDescriptionStyles: React.CSSProperties = {
  margin: 0,
  color: settingsColorTokens.textSecondary,
  lineHeight: 1.6,
};

const settingsTabs: ReadonlyArray<{
  readonly id: SettingsTab;
  readonly label: string;
}> = [
  { id: "claude", label: "Claude" },
  { id: "codex", label: "Codex" },
  { id: "gemini", label: "Gemini" },
  { id: "general", label: "General" },
];

const SettingsView: React.FC<SettingsViewProps> = ({
  mode = "full",
  onClose,
  state,
}) => {
  const { ready } = useLocalization();
  const [activeTab, setActiveTab] = useState<SettingsTab>("claude");
  const {
    coreControl,
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
    handleCodexDefaultModelChange,
    handleClaudeDefaultModelChange,
    handleGeminiDefaultModelChange,
    handleGeminiThinkingChange,
    handleClaudeThinkingDisplaySyncChange,
    handleCodexThinkingDisplaySyncChange,
    handleGeminiThinkingDisplaySyncChange,
    handleLocalizationCategoryLanguageChange,
    handleLocalizationDefaultLanguageChange,
    handleLocalizationEngineIdChange,
    handleLocalizationGlossaryEnabledChange,
    handleLocalizationWorkflowTermsPolicyChange,
    handleReasoningTranslationEngineIdChange,
    handleCodexReasoningChange,
    handleProviderAutoUpdateChange,
    handleRestartCore,
    handleResponsePolicyModeChange,
    handleStrictSchemaTextChange,
    handleStrictInstructionTextChange,
    handleSave,
    handleReset,
    handleUpdateProvider,
  } = state;
  const renderProjectManagerGeneralTab =
    mode !== "project-manager" && state.supportsCoreRestart === false;
  const localizationSyncTitle = "Synchronizing localization";
  const localizationSyncDescription =
    "Please wait. CodeAI Hub is rebuilding the translated interface bundles affected by this change. Project Manager and new sessions stay blocked until the affected bundles are ready.";

  useEffect(() => {
    if (typeof state.hostPostMessage !== "function") {
      return;
    }
    const previousPostMessage = vscode.postMessage;
    vscode.postMessage = (message: unknown) => {
      state.hostPostMessage?.(message);
    };
    return () => {
      vscode.postMessage = previousPostMessage;
    };
  }, [state.hostPostMessage]);

  return (
    <div aria-busy={saving || !ready} style={containerStyles}>
      <style>
        {
          "@keyframes settings-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"
        }
      </style>
      <SettingsHeader onClose={onClose} />
      <div style={tabBarStyles}>
        {settingsTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...tabButtonStyles,
              ...(activeTab === tab.id ? activeTabStyles : null),
            }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={contentStyles}>
        {(() => {
          if (activeTab === "claude") {
            return (
              <div style={stackStyles}>
                <ClaudeDefaultModelCard
                  defaultModel={settings.providers.claude.defaultModel}
                  onDefaultModelChange={handleClaudeDefaultModelChange}
                />
                <ProviderVersions
                  autoUpdateEnabled={
                    settings.providers.claude.autoUpdate.enabled
                  }
                  onAutoUpdateChange={handleProviderAutoUpdateChange}
                  onUpdate={handleUpdateProvider}
                  provider="claude"
                  versions={versions}
                />
                <ThinkingSettings
                  effort={settings.providers.claude.thinking.effort}
                  enabled={settings.providers.claude.thinking.enabled}
                  onChange={handleThinkingSettingsChange}
                  onThinkingDisplaySyncChange={
                    handleClaudeThinkingDisplaySyncChange
                  }
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
          if (activeTab === "general") {
            return (
              <div style={stackStyles}>
                {renderProjectManagerGeneralTab ? (
                  <>
                    <GeneralResponseModeFacade
                      onModeChange={handleResponsePolicyModeChange}
                      onStrictInstructionTextChange={
                        handleStrictInstructionTextChange
                      }
                      onStrictSchemaTextChange={handleStrictSchemaTextChange}
                      responsePolicy={settings.general.responsePolicy}
                    />
                    <LocalizationSettingsCard
                      localization={settings.general.localization}
                      onCategoryLanguageChange={
                        handleLocalizationCategoryLanguageChange
                      }
                      onDefaultLanguageChange={
                        handleLocalizationDefaultLanguageChange
                      }
                      onEngineIdChange={handleLocalizationEngineIdChange}
                      onGlossaryEnabledChange={
                        handleLocalizationGlossaryEnabledChange
                      }
                      onReasoningTranslationEngineIdChange={
                        handleReasoningTranslationEngineIdChange
                      }
                      onWorkflowTermsPolicyChange={
                        handleLocalizationWorkflowTermsPolicyChange
                      }
                    />
                  </>
                ) : (
                  <GeneralSettings
                    coreControl={coreControl}
                    localization={settings.general.localization}
                    onLocalizationCategoryLanguageChange={
                      handleLocalizationCategoryLanguageChange
                    }
                    onLocalizationDefaultLanguageChange={
                      handleLocalizationDefaultLanguageChange
                    }
                    onLocalizationEngineIdChange={
                      handleLocalizationEngineIdChange
                    }
                    onLocalizationGlossaryEnabledChange={
                      handleLocalizationGlossaryEnabledChange
                    }
                    onLocalizationWorkflowTermsPolicyChange={
                      handleLocalizationWorkflowTermsPolicyChange
                    }
                    onReasoningTranslationEngineIdChange={
                      handleReasoningTranslationEngineIdChange
                    }
                    onResponsePolicyModeChange={handleResponsePolicyModeChange}
                    onRestartCore={handleRestartCore}
                    onStrictInstructionTextChange={
                      handleStrictInstructionTextChange
                    }
                    onStrictSchemaTextChange={handleStrictSchemaTextChange}
                    responsePolicy={settings.general.responsePolicy}
                  />
                )}
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
                  onReasoningSummaryEnabledChange={
                    handleCodexThinkingDisplaySyncChange
                  }
                  reasoningByModel={settings.providers.codex.reasoningByModel}
                  reasoningSummaryEnabled={
                    settings.providers.codex.reasoningSummaryEnabled
                  }
                />
                <ProviderVersions
                  autoUpdateEnabled={
                    settings.providers.codex.autoUpdate.enabled
                  }
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
                    settings.providers.codex.sessionContinuity
                      .remainingPercentThreshold
                  }
                  title="Codex Session Continuity"
                />
              </div>
            );
          }
          return (
            <div style={stackStyles}>
              <GeminiDefaultModelCard
                defaultModel={settings.providers.gemini.defaultModel}
                onDefaultModelChange={handleGeminiDefaultModelChange}
                onThinkingChange={handleGeminiThinkingChange}
                onThinkingDisplaySyncChange={
                  handleGeminiThinkingDisplaySyncChange
                }
                thinkingDisplaySyncEnabled={
                  settings.providers.gemini.thinkingDisplaySyncEnabled
                }
                thinkingLevelByModel={
                  settings.providers.gemini.thinkingLevelByModel
                }
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
                  settings.providers.gemini.sessionContinuity
                    .contextWindowTokenLimit
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
        })()}
      </div>
      <SettingsFooter
        hasChanges={hasChanges}
        onClose={onClose}
        onReset={handleReset}
        onSave={handleSave}
        resetting={resetting}
        saving={saving}
      />
      {saving ? (
        <div aria-live="polite" role="status" style={syncOverlayStyles}>
          <div style={syncCardStyles}>
            <div style={syncSpinnerStyles} />
            <p style={syncTitleStyles}>{localizationSyncTitle}</p>
            <p style={syncDescriptionStyles}>{localizationSyncDescription}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(SettingsView);

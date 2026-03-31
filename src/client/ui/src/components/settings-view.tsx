import React, { useState } from "react";
import ClaudeDefaultModelCard from "./settings/claude-default-model/claude-default-model-card";
import CodexDefaultModelCard from "./settings/codex-default-model/codex-default-model-card";
import GeminiDefaultModelCard from "./settings/gemini-default-model/gemini-default-model-card";
import GeneralSettings from "./settings/general-settings";
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
import { useSettingsState } from "./settings/use-settings-state";

type SettingsMode = "settings-only" | "full";
interface SettingsViewProps {
  readonly mode?: SettingsMode;
  readonly onClose: () => void;
}

type SettingsTab = "claude" | "codex" | "gemini" | "general";

const containerStyles: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
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

const modeNoticeStyles: React.CSSProperties = {
  margin: `16px ${settingsSpacingTokens.pagePadding} 0`,
  padding: "12px 14px",
  borderRadius: "10px",
  background: settingsColorTokens.surfaceElevated,
  border: `1px solid ${settingsColorTokens.borderSubtle}`,
  color: settingsColorTokens.textSecondary,
  fontSize: settingsTypographyTokens.bodyFontSize,
  lineHeight: 1.5,
};

const modeNoticeTitleStyles: React.CSSProperties = {
  color: settingsColorTokens.textPrimary,
  fontSize: settingsTypographyTokens.titleFontSize,
  fontWeight: 600,
  marginBottom: "4px",
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
  onClose,
  mode = "full",
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("claude");
  const {
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
    handleCodexThinkingDisplaySyncChange,
    handleGeminiThinkingDisplaySyncChange,
    handleCodexReasoningChange,
    handleProviderAutoUpdateChange,
    handleResponsePolicyModeChange,
    handleStrictSchemaTextChange,
    handleStrictInstructionTextChange,
    handleSave,
    handleReset,
    handleUpdateProvider,
  } = useSettingsState();

  return (
    <div style={containerStyles}>
      <SettingsHeader onClose={onClose} />
      {mode === "settings-only" ? (
        <div style={modeNoticeStyles}>
          <div style={modeNoticeTitleStyles}>Settings only mode</div>
          <div>Sessions and chats are available in Project Manager.</div>
        </div>
      ) : null}
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
                  enabled={settings.providers.claude.thinking.enabled}
                  maxTokens={settings.providers.claude.thinking.maxTokens}
                  onChange={handleThinkingSettingsChange}
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
                <GeneralSettings
                  onResponsePolicyModeChange={handleResponsePolicyModeChange}
                  onStrictInstructionTextChange={
                    handleStrictInstructionTextChange
                  }
                  onStrictSchemaTextChange={handleStrictSchemaTextChange}
                  responsePolicy={settings.general.responsePolicy}
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
    </div>
  );
};

export default React.memo(SettingsView);

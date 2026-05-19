import type { CSSProperties, FC } from "react";
import type { KimiModelId } from "../../../../../types/kimi-model-registry";
import KimiClaudeCodeSettingsCard from "./kimi-claude-code-settings-card";
import KimiDefaultModelCard from "./kimi-default-model-card";
import { settingsSpacingTokens } from "./style-tokens";

interface KimiSettingsTabProps {
  readonly kimiClaudeCodeThinkingDisplaySyncEnabled?: boolean;
  readonly kimiDefaultModel?: KimiModelId;
  readonly kimiThinkingDisplaySyncEnabled?: boolean;
  readonly onKimiClaudeCodeThinkingDisplaySyncChange?: (
    enabled: boolean
  ) => void;
  readonly onKimiDefaultModelChange?: (modelId: KimiModelId) => void;
  readonly onKimiThinkingDisplaySyncChange?: (enabled: boolean) => void;
}

const stackStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: settingsSpacingTokens.containerGap,
};

const KimiSettingsTab: FC<KimiSettingsTabProps> = ({
  kimiClaudeCodeThinkingDisplaySyncEnabled,
  kimiDefaultModel,
  kimiThinkingDisplaySyncEnabled,
  onKimiClaudeCodeThinkingDisplaySyncChange,
  onKimiDefaultModelChange,
  onKimiThinkingDisplaySyncChange,
}) => (
  <div style={stackStyles}>
    <KimiDefaultModelCard
      defaultModel={kimiDefaultModel}
      onDefaultModelChange={onKimiDefaultModelChange}
      onThinkingDisplaySyncChange={onKimiThinkingDisplaySyncChange}
      thinkingDisplaySyncEnabled={kimiThinkingDisplaySyncEnabled}
    />
    <KimiClaudeCodeSettingsCard
      onThinkingDisplaySyncChange={onKimiClaudeCodeThinkingDisplaySyncChange}
      thinkingDisplaySyncEnabled={kimiClaudeCodeThinkingDisplaySyncEnabled}
    />
  </div>
);

export default KimiSettingsTab;

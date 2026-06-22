import type { CSSProperties, FC } from "react";
import type { KimiModelId } from "../../../../../types/kimi-model-registry";
import KimiDefaultModelCard from "./kimi-default-model-card";
import { settingsSpacingTokens } from "./style-tokens";

interface KimiSettingsTabProps {
  readonly kimiDefaultModel?: KimiModelId;
  readonly kimiThinkingDisplaySyncEnabled?: boolean;
  readonly kimiThinkingEnabled?: boolean;
  readonly onKimiDefaultModelChange?: (modelId: KimiModelId) => void;
  readonly onKimiThinkingDisplaySyncChange?: (enabled: boolean) => void;
  readonly onKimiThinkingEnabledChange?: (enabled: boolean) => void;
}

const stackStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: settingsSpacingTokens.containerGap,
};

const KimiSettingsTab: FC<KimiSettingsTabProps> = ({
  kimiDefaultModel,
  kimiThinkingDisplaySyncEnabled,
  kimiThinkingEnabled,
  onKimiDefaultModelChange,
  onKimiThinkingDisplaySyncChange,
  onKimiThinkingEnabledChange,
}) => (
  <div style={stackStyles}>
    <KimiDefaultModelCard
      defaultModel={kimiDefaultModel}
      onDefaultModelChange={onKimiDefaultModelChange}
      onThinkingDisplaySyncChange={onKimiThinkingDisplaySyncChange}
      onThinkingEnabledChange={onKimiThinkingEnabledChange}
      thinkingDisplaySyncEnabled={kimiThinkingDisplaySyncEnabled}
      thinkingEnabled={kimiThinkingEnabled}
    />
  </div>
);

export default KimiSettingsTab;

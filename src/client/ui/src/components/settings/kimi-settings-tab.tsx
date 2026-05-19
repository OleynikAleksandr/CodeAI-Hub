import type { CSSProperties, FC } from "react";
import type { KimiModelId } from "../../../../../types/kimi-model-registry";
import KimiDefaultModelCard from "./kimi-default-model-card";
import { settingsSpacingTokens } from "./style-tokens";

interface KimiSettingsTabProps {
  readonly kimiDefaultModel?: KimiModelId;
  readonly kimiThinkingDisplaySyncEnabled?: boolean;
  readonly onKimiDefaultModelChange?: (modelId: KimiModelId) => void;
  readonly onKimiThinkingDisplaySyncChange?: (enabled: boolean) => void;
}

const stackStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: settingsSpacingTokens.containerGap,
};

const KimiSettingsTab: FC<KimiSettingsTabProps> = ({
  kimiDefaultModel,
  kimiThinkingDisplaySyncEnabled,
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
  </div>
);

export default KimiSettingsTab;

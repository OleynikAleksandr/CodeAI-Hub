import React from "react";
import SettingsCard from "./settings-card";

type SessionContinuityCardProps = {
  readonly title: string;
  readonly remainingPercentThreshold: number;
  readonly onRemainingPercentThresholdChange: (value: number) => void;
  readonly contextWindowTokenLimit?: number;
  readonly onContextWindowTokenLimitChange?: (value: number) => void;
};

const settingsLabelStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  fontSize: "12px",
  color: "#cccccc",
};

const settingsDescriptionStyles: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  lineHeight: 1.5,
  color: "#aaaaaa",
};

const settingsInputStyles: React.CSSProperties = {
  width: "220px",
  background: "#1e1e1e",
  border: "1px solid #3c3c3c",
  borderRadius: "6px",
  padding: "8px 10px",
  color: "#cccccc",
};

const SessionContinuityCard: React.FC<SessionContinuityCardProps> = ({
  title,
  remainingPercentThreshold,
  onRemainingPercentThresholdChange,
  contextWindowTokenLimit,
  onContextWindowTokenLimitChange,
}) => (
  <SettingsCard title={title}>
    <p style={settingsDescriptionStyles}>
      When the remaining context window drops to or below this percentage,
      CodeAI Hub can automatically wrap up the current session (with a report)
      and start a new one. Default: 30%.
    </p>
    {typeof contextWindowTokenLimit === "number" &&
    onContextWindowTokenLimitChange ? (
      <label style={settingsLabelStyles}>
        Context window limit (tokens)
        <input
          max={1_000_000}
          min={10_000}
          onChange={(event) =>
            onContextWindowTokenLimitChange(Number(event.target.value))
          }
          style={settingsInputStyles}
          type="number"
          value={contextWindowTokenLimit}
        />
      </label>
    ) : null}
    <label style={settingsLabelStyles}>
      Remaining context threshold (%)
      <input
        max={80}
        min={5}
        onChange={(event) =>
          onRemainingPercentThresholdChange(Number(event.target.value))
        }
        style={settingsInputStyles}
        type="number"
        value={remainingPercentThreshold}
      />
    </label>
  </SettingsCard>
);

export default React.memo(SessionContinuityCard);

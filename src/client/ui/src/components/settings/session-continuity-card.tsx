import React from "react";
import SettingsCard from "./settings-card";

interface SessionContinuityCardProps {
  readonly contextWindowTokenLimit?: number;
  readonly onContextWindowTokenLimitChange?: (value: number) => void;
  readonly onRemainingPercentThresholdChange: (value: number) => void;
  readonly remainingPercentThreshold: number;
  readonly title: string;
}

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

interface ManualIntegerInputProps {
  readonly id: string;
  readonly max: number;
  readonly min: number;
  readonly onCommit: (value: number) => void;
  readonly value: number;
}

const UNSIGNED_INTEGER_RE = /^\d+$/;

const isUnsignedIntegerText = (value: string): boolean =>
  UNSIGNED_INTEGER_RE.test(value);

const clampInteger = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const ManualIntegerInput: React.FC<ManualIntegerInputProps> = ({
  id,
  value,
  min,
  max,
  onCommit,
}) => {
  const [draft, setDraft] = React.useState(() => String(value));

  React.useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = React.useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setDraft(String(value));
      return;
    }
    if (!isUnsignedIntegerText(trimmed)) {
      setDraft(String(value));
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }

    const clamped = clampInteger(parsed, min, max);
    onCommit(clamped);
    setDraft(String(clamped));
  }, [draft, max, min, onCommit, value]);

  return (
    <input
      autoComplete="off"
      id={id}
      inputMode="numeric"
      onBlur={commitDraft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setDraft(String(value));
          event.currentTarget.blur();
        }
      }}
      pattern="[0-9]*"
      style={settingsInputStyles}
      type="text"
      value={draft}
    />
  );
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
      <label
        htmlFor={`${title}-context-window-token-limit`}
        style={settingsLabelStyles}
      >
        Context window limit (tokens)
        <ManualIntegerInput
          id={`${title}-context-window-token-limit`}
          max={1_000_000}
          min={10_000}
          onCommit={onContextWindowTokenLimitChange}
          value={contextWindowTokenLimit}
        />
      </label>
    ) : null}
    <label
      htmlFor={`${title}-remaining-percent-threshold`}
      style={settingsLabelStyles}
    >
      Remaining context threshold (%)
      <ManualIntegerInput
        id={`${title}-remaining-percent-threshold`}
        max={80}
        min={5}
        onCommit={onRemainingPercentThresholdChange}
        value={remainingPercentThreshold}
      />
    </label>
  </SettingsCard>
);

export default React.memo(SessionContinuityCard);

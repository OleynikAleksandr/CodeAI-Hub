import React from "react";

const MODEL_OPTIONS: Record<string, readonly string[]> = {
  claude: ["sonnet", "opus", "haiku"],
  codex: ["gpt-5.3-codex", "gpt-5.2"],
};

const REASONING_OPTIONS: Record<string, readonly string[]> = {
  claude: [
    "thinking-off",
    "thinking-low",
    "thinking-medium",
    "thinking-high",
    "thinking-xhigh",
    "thinking-max",
  ],
  codex: ["reasoning-low", "reasoning-medium", "reasoning-high"],
};

interface CaptureWorkbenchModelReasoningSelectorsProps {
  readonly model: string;
  readonly onModelChange: (model: string) => void;
  readonly onReasoningChange: (reasoning: string) => void;
  readonly provider: string;
  readonly reasoning: string;
}

export const CaptureWorkbenchModelReasoningSelectors: React.FC<
  CaptureWorkbenchModelReasoningSelectorsProps
> = ({ model, onModelChange, onReasoningChange, provider, reasoning }) => (
  <>
    <Selector
      label="Model"
      onChange={onModelChange}
      options={(MODEL_OPTIONS[provider] ?? MODEL_OPTIONS.claude).map(
        (value) => ({ value, label: value })
      )}
      value={model}
    />
    <Selector
      label="Reasoning"
      onChange={onReasoningChange}
      options={(REASONING_OPTIONS[provider] ?? REASONING_OPTIONS.claude).map(
        (value) => ({ value, label: value.replace("-", " ") })
      )}
      value={reasoning}
    />
  </>
);

const Selector: React.FC<{
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly value: string;
}> = ({ label, onChange, options, value }) => (
  <label style={styles.selector}>
    <span style={styles.selectorLabel}>{label}</span>
    <select
      onChange={(event) => onChange(event.currentTarget.value)}
      style={styles.select}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const styles: Record<string, React.CSSProperties> = {
  selector: {
    alignItems: "center",
    background: "#2c313b",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: 6,
    display: "inline-flex",
    gap: 8,
    minWidth: 0,
    padding: "7px 10px",
  },
  selectorLabel: {
    color: "#7e828a",
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
  },
  select: {
    appearance: "none",
    background: "transparent",
    border: 0,
    color: "#e6e8eb",
    fontSize: 13,
    fontWeight: 500,
    outline: "none",
  },
};

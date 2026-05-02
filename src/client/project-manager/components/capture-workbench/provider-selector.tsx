import React from "react";

const GEMINI_TOOLTIP = "Gemini support arrives with parent Phase 2";

const PROVIDER_OPTIONS = [
  { value: "claude", label: "Claude", disabled: false },
  { value: "codex", label: "Codex", disabled: false },
  { value: "gemini", label: "Gemini", disabled: true },
] as const;

interface CaptureWorkbenchProviderSelectorProps {
  readonly onChange: (provider: string) => void;
  readonly value: string;
}

export const CaptureWorkbenchProviderSelector: React.FC<
  CaptureWorkbenchProviderSelectorProps
> = ({ onChange, value }) => (
  <label
    style={{
      ...styles.selector,
      ...(value === "claude" ? styles.selectorClaude : {}),
      ...(value === "codex" ? styles.selectorCodex : {}),
    }}
  >
    <span style={styles.selectorLabel}>Provider</span>
    <select
      onChange={(event) => onChange(event.currentTarget.value)}
      style={styles.select}
      value={value}
    >
      {PROVIDER_OPTIONS.map((option) => (
        <option
          disabled={option.disabled}
          key={option.value}
          title={option.disabled ? GEMINI_TOOLTIP : undefined}
          value={option.value}
        >
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
  selectorClaude: {
    background: "rgba(230, 166, 116, 0.18)",
    borderColor: "rgba(230, 166, 116, 0.55)",
  },
  selectorCodex: {
    background: "rgba(103, 192, 212, 0.18)",
    borderColor: "rgba(103, 192, 212, 0.55)",
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

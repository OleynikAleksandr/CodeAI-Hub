import React from "react";

interface StepOption {
  readonly disabled?: boolean;
  readonly label: string;
  readonly value: string;
}

const STEP_GROUPS: readonly {
  readonly label: string;
  readonly options: readonly StepOption[];
}[] = [
  {
    label: "Trunk Workflow",
    options: [
      { value: "description", label: "Description" },
      { value: "virtual_simulation", label: "Virtual Simulation" },
      { value: "diagram_modules", label: "Diagram Modules" },
    ],
  },
  {
    label: "Translation",
    options: [{ value: "translation", label: "Translation" }],
  },
  {
    label: "Development Tree",
    options: [{ value: "development_tree", label: "Development Tree", disabled: true }],
  },
];

interface CaptureWorkbenchStepSelectorProps {
  readonly onChange: (step: string) => void;
  readonly value: string;
}

export const CaptureWorkbenchStepSelector: React.FC<
  CaptureWorkbenchStepSelectorProps
> = ({ onChange, value }) => (
  <label style={styles.selector}>
    <span style={styles.selectorLabel}>Step</span>
    <select
      onChange={(event) => onChange(event.currentTarget.value)}
      style={styles.select}
      value={value}
    >
      {STEP_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((option) => (
            <option
              disabled={option.disabled}
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </optgroup>
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

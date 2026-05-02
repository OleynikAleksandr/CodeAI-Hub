import React, { useEffect, useState } from "react";
import type { WorkbenchSelectionState } from "../../services/workbench-bridge-types";
import type { WorkbenchStateClientApi } from "../../services/workbench-state-client";
import { CaptureWorkbenchStepSelector } from "./step-selector";

const DEFAULT_SELECTION: WorkbenchSelectionState = {
  step: "description",
  provider: "claude",
  model: "sonnet",
  reasoning: "thinking-high",
};

const PROVIDER_OPTIONS = [
  { value: "claude", label: "Claude", disabled: false },
  { value: "codex", label: "Codex", disabled: false },
  { value: "gemini", label: "Gemini", disabled: true },
] as const;

const PROVIDER_DEFAULTS: Record<
  string,
  { readonly model: string; readonly reasoning: string }
> = {
  claude: { model: "sonnet", reasoning: "thinking-high" },
  codex: { model: "gpt-5.3-codex", reasoning: "reasoning-high" },
};

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

interface CaptureWorkbenchSelectionBarProps {
  readonly onSelectionChange?: (selection: WorkbenchSelectionState) => void;
  readonly stateClient: Pick<
    WorkbenchStateClientApi,
    "loadSelection" | "saveSelection"
  >;
}

export const CaptureWorkbenchSelectionBar: React.FC<
  CaptureWorkbenchSelectionBarProps
> = ({ onSelectionChange, stateClient }) => {
  const [selection, setSelection] =
    useState<WorkbenchSelectionState>(DEFAULT_SELECTION);

  useEffect(() => {
    let cancelled = false;
    stateClient
      .loadSelection()
      .then((file) => {
        if (cancelled) {
          return;
        }
        const nextSelection = file?.selection ?? DEFAULT_SELECTION;
        setSelection(nextSelection);
        onSelectionChange?.(nextSelection);
      })
      .catch(() => {
        if (!cancelled) {
          onSelectionChange?.(DEFAULT_SELECTION);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onSelectionChange, stateClient]);

  const updateSelection = (nextSelection: WorkbenchSelectionState): void => {
    setSelection(nextSelection);
    onSelectionChange?.(nextSelection);
    stateClient.saveSelection({
      version: 1,
      selection: nextSelection,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateProvider = (provider: string): void => {
    const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.claude;
    updateSelection({ ...selection, provider, ...defaults });
  };

  return (
    <section aria-label="Capture selection" style={styles.selectionBar}>
      <CaptureWorkbenchStepSelector
        onChange={(step) => updateSelection({ ...selection, step })}
        value={selection.step}
      />
      <SelectField
        label="Provider"
        onChange={updateProvider}
        options={PROVIDER_OPTIONS}
        tone={selection.provider === "claude" ? "claude" : "codex"}
        value={selection.provider}
      />
      <SelectField
        label="Model"
        onChange={(model) => updateSelection({ ...selection, model })}
        options={(MODEL_OPTIONS[selection.provider] ?? MODEL_OPTIONS.claude).map(
          (value) => ({ value, label: value })
        )}
        value={selection.model}
      />
      <SelectField
        label="Reasoning"
        onChange={(reasoning) => updateSelection({ ...selection, reasoning })}
        options={(
          REASONING_OPTIONS[selection.provider] ?? REASONING_OPTIONS.claude
        ).map((value) => ({ value, label: value.replace("-", " ") }))}
        value={selection.reasoning}
      />
    </section>
  );
};

const SelectField: React.FC<{
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly {
    readonly disabled?: boolean;
    readonly label: string;
    readonly value: string;
  }[];
  readonly tone?: "claude" | "codex";
  readonly value: string;
}> = ({ label, onChange, options, tone, value }) => (
  <label
    data-provider={tone}
    style={{
      ...styles.selector,
      ...(tone === "claude" ? styles.selectorClaude : {}),
      ...(tone === "codex" ? styles.selectorCodex : {}),
    }}
  >
    <span style={styles.selectorLabel}>{label}</span>
    <select
      onChange={(event) => onChange(event.currentTarget.value)}
      style={styles.select}
      value={value}
    >
      {options.map((option) => (
        <option
          disabled={option.disabled}
          key={option.value}
          title={
            option.disabled
              ? "Gemini support arrives with parent Phase 2"
              : undefined
          }
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const styles: Record<string, React.CSSProperties> = {
  selectionBar: {
    alignItems: "center",
    background: "#20232a",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    padding: "12px 16px",
  },
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

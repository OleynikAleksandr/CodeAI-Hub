import React from "react";
import { CaptureWorkbenchDomListboxSelector } from "./dom-listbox-selector";

const GEMINI_TOOLTIP = "Gemini support arrives with parent Phase 2";

const PROVIDER_OPTIONS = [
  { value: "claude", label: "Claude", disabled: false },
  { value: "codex", label: "Codex", disabled: false },
  { value: "kimi", label: "Kimi", disabled: false },
  { value: "glmOpenCode", label: "OpenCode", disabled: false },
  { value: "gemini", label: "Gemini", disabled: true },
] as const;

interface CaptureWorkbenchProviderSelectorProps {
  readonly onChange: (provider: string) => void;
  readonly value: string;
}

export const CaptureWorkbenchProviderSelector: React.FC<
  CaptureWorkbenchProviderSelectorProps
> = ({ onChange, value }) => (
  <CaptureWorkbenchDomListboxSelector
    label="Provider"
    onChange={onChange}
    options={PROVIDER_OPTIONS.map((option) => ({
      ...option,
      title: option.disabled ? GEMINI_TOOLTIP : undefined,
    }))}
    tone={value === "claude" || value === "codex" ? value : undefined}
    value={value}
  />
);

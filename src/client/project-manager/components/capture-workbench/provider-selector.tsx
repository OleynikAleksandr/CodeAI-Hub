import React from "react";
import { CaptureWorkbenchDomListboxSelector } from "./dom-listbox-selector";

const PROVIDER_OPTIONS = [
  { value: "claude", label: "Claude" },
  { value: "codex", label: "Codex" },
  { value: "kimi", label: "Kimi" },
  { value: "glmOpenCode", label: "OpenCode" },
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
    options={PROVIDER_OPTIONS}
    tone={value === "claude" || value === "codex" ? value : undefined}
    value={value}
  />
);

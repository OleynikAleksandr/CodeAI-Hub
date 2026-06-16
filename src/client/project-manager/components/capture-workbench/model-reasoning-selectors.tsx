import React from "react";
import { CaptureWorkbenchDomListboxSelector } from "./dom-listbox-selector";

const MODEL_OPTIONS: Record<string, readonly string[]> = {
  claude: ["sonnet", "opus", "haiku"],
  codex: ["gpt-5.4-mini", "gpt-5.2"],
  kimi: ["kimi-k2.7-code"],
  glmClaudeCode: ["glm-5.2"],
  glmOpenCode: ["zai-coding-plan/glm-5.2", "kimi-for-coding/k2p7"],
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
  kimi: ["default"],
  glmOpenCode: ["default"],
  glmClaudeCode: [
    "thinking-off",
    "thinking-low",
    "thinking-medium",
    "thinking-high",
  ],
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
    <CaptureWorkbenchDomListboxSelector
      label="Model"
      onChange={onModelChange}
      options={(MODEL_OPTIONS[provider] ?? MODEL_OPTIONS.claude).map(
        (value) => ({ value, label: value })
      )}
      value={model}
    />
    <CaptureWorkbenchDomListboxSelector
      label="Reasoning"
      onChange={onReasoningChange}
      options={(REASONING_OPTIONS[provider] ?? REASONING_OPTIONS.claude).map(
        (value) => ({ value, label: value.replace("-", " ") })
      )}
      value={reasoning}
    />
  </>
);

import React from "react";
import {
  CLAUDE_MODEL_ALIASES,
  CLAUDE_THINKING_EFFORTS,
  DEFAULT_CLAUDE_MODEL_ALIAS,
  DEFAULT_CLAUDE_THINKING_EFFORT,
} from "../../../../types/claude-model-registry";
import {
  CODEX_REASONING_LEVELS,
  CODEX_SETTINGS_MODELS,
  DEFAULT_CODEX_MODEL_ID,
  DEFAULT_CODEX_REASONING_LEVEL,
} from "../../../../types/codex-model-registry";
import {
  DEFAULT_KIMI_MODEL_ID,
  KIMI_RECOMMENDED_MODELS,
} from "../../../../types/kimi-model-registry";
import { GLM_OPENCODE_MODEL_OPTIONS } from "../../../ui/src/components/settings/kimi-settings-state";
import { CaptureWorkbenchDomListboxSelector } from "./dom-listbox-selector";

interface CaptureWorkbenchSelectorOption {
  readonly label: string;
  readonly value: string;
}

export const CAPTURE_WORKBENCH_PROVIDER_DEFAULTS: Record<
  string,
  { readonly model: string; readonly reasoning: string }
> = {
  claude: {
    model: DEFAULT_CLAUDE_MODEL_ALIAS,
    reasoning: `thinking-${DEFAULT_CLAUDE_THINKING_EFFORT}`,
  },
  codex: {
    model: DEFAULT_CODEX_MODEL_ID,
    reasoning: `reasoning-${DEFAULT_CODEX_REASONING_LEVEL}`,
  },
  kimi: { model: DEFAULT_KIMI_MODEL_ID, reasoning: "default" },
  glmOpenCode: {
    model: GLM_OPENCODE_MODEL_OPTIONS[0].id,
    reasoning: "default",
  },
};

const MODEL_OPTIONS: Record<string, readonly CaptureWorkbenchSelectorOption[]> =
  {
    claude: CLAUDE_MODEL_ALIASES.map((model) => ({
      label: model.displayName,
      value: model.alias,
    })),
    codex: CODEX_SETTINGS_MODELS.map((model) => ({
      label: model.displayName,
      value: model.id,
    })),
    kimi: KIMI_RECOMMENDED_MODELS.map((model) => ({
      label: model.displayName,
      value: model.id,
    })),
    glmOpenCode: GLM_OPENCODE_MODEL_OPTIONS.map((model) => ({
      label: model.label,
      value: model.id,
    })),
  };

const REASONING_OPTIONS: Record<
  string,
  readonly CaptureWorkbenchSelectorOption[]
> = {
  claude: [
    { value: "thinking-off", label: "thinking off" },
    ...CLAUDE_THINKING_EFFORTS.map((effort) => ({
      label: `thinking ${effort.name}`,
      value: `thinking-${effort.name}`,
    })),
  ],
  codex: CODEX_REASONING_LEVELS.map((level) => ({
    label: `reasoning ${level.name}`,
    value: `reasoning-${level.name}`,
  })),
  kimi: [{ value: "default", label: "default" }],
  glmOpenCode: [{ value: "default", label: "default" }],
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
      options={MODEL_OPTIONS[provider] ?? MODEL_OPTIONS.claude}
      value={model}
    />
    <CaptureWorkbenchDomListboxSelector
      label="Reasoning"
      onChange={onReasoningChange}
      options={REASONING_OPTIONS[provider] ?? REASONING_OPTIONS.claude}
      value={reasoning}
    />
  </>
);

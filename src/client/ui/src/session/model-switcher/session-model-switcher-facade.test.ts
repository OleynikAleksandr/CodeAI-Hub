import assert from "node:assert/strict";
import test from "node:test";
import type { ClaudeModelAliasId } from "../../../../../types/claude-model-registry";
import type { ModelInfo } from "../../../../../types/session";
import { createDefaultSettings } from "../../components/settings/settings-state-model";
import { SessionModelSwitcherFacade } from "./session-model-switcher-facade";

const createModelInfo = (modelId: string, reasoning?: string): ModelInfo => ({
  modelDisplayName: modelId,
  modelId,
  providerId: "codexCli",
  providerName: "Codex",
  ...(reasoning ? { reasoning } : {}),
  source: "binding",
});

test("SessionModelSwitcherFacade builds Codex options from effective binding identity", () => {
  const facade = new SessionModelSwitcherFacade();
  const state = facade.buildState({
    providerId: "codexCli",
    settings: createDefaultSettings(),
    modelInfo: createModelInfo("gpt-5.3-codex-spark reasoning:xhigh"),
  });

  assert.equal(state.providerKey, "codex");
  assert.equal(state.selectedModelId, "gpt-5.3-codex-spark");
  assert.equal(state.selectedReasoningId, "xhigh");
  assert.equal(state.effectiveModelId, "gpt-5.3-codex-spark reasoning:xhigh");
  assert.equal(
    state.modelOptions.find((option) => option.id === "gpt-5.3-codex-spark")
      ?.selected,
    true
  );
  assert.equal(
    state.reasoningOptions.find((option) => option.id === "xhigh")?.selected,
    true
  );
});

test("SessionModelSwitcherFacade limits Gemini reasoning options to selected model support", () => {
  const facade = new SessionModelSwitcherFacade();
  const state = facade.buildState({
    providerId: "geminiCli",
    settings: createDefaultSettings(),
    modelInfo: {
      ...createModelInfo("gemini-3.1-flash-lite-preview thinking:off"),
      providerId: "geminiCli",
      providerName: "Gemini",
    },
  });

  assert.equal(state.providerKey, "gemini");
  assert.equal(state.selectedModelId, "gemini-3.1-flash-lite-preview");
  assert.equal(state.selectedReasoningId, "off");
  assert.deepEqual(
    state.reasoningOptions.map((option) => option.id),
    ["off", "minimal", "low"]
  );
});

test("SessionModelSwitcherFacade represents Claude thinking off as selectable reasoning", () => {
  const facade = new SessionModelSwitcherFacade();
  const settings = createDefaultSettings();
  const state = facade.buildState({
    providerId: "claudeCodeCli",
    settings: {
      ...settings,
      providers: {
        ...settings.providers,
        claude: {
          ...settings.providers.claude,
          defaultModel: "opus" as ClaudeModelAliasId,
          thinking: {
            ...settings.providers.claude.thinking,
            enabled: false,
          },
        },
      },
    },
  });

  assert.equal(state.providerKey, "claude");
  assert.equal(state.selectedModelId, "opus");
  assert.equal(state.selectedReasoningId, "off");
  assert.equal(state.effectiveModelId, "opus thinking:off");
  assert.equal(state.reasoningOptions[0]?.id, "off");
  assert.equal(
    state.reasoningOptions.some((option) => option.id === "xhigh"),
    true
  );
});

test("SessionModelSwitcherFacade builds provider-specific effective selections", () => {
  const facade = new SessionModelSwitcherFacade();

  assert.equal(
    facade.buildSelection({
      providerId: "codexCli",
      modelId: "gpt-5.4",
      reasoningId: "high",
    }).effectiveModelId,
    "gpt-5.4 reasoning:high"
  );
  assert.equal(
    facade.buildSelection({
      providerId: "geminiCli",
      modelId: "gemini-3-flash-preview",
      reasoningId: "medium",
    }).effectiveModelId,
    "gemini-3-flash-preview thinking:medium"
  );
  assert.equal(
    facade.buildSelection({
      providerId: "claudeCodeCli",
      modelId: "sonnet",
      reasoningId: "max",
    }).effectiveModelId,
    "sonnet reasoning:max"
  );
});

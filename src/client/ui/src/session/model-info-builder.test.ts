import assert from "node:assert/strict";
import test from "node:test";
import type { ClaudeThinkingEffort } from "../../../../types/claude-model-registry";
import { createDefaultSettings } from "../components/settings/settings-state-model";
import {
  buildModelInfo,
  buildModelInfoFromBinding,
} from "./model-info-builder";

test("buildModelInfo uses Claude thinking effort from settings when no runtime override exists", () => {
  const settings = createDefaultSettings();
  const customizedSettings = {
    ...settings,
    providers: {
      ...settings.providers,
      claude: {
        ...settings.providers.claude,
        thinking: {
          enabled: true,
          effort: "high" as ClaudeThinkingEffort,
        },
      },
    },
  };

  const modelInfo = buildModelInfo("claudeCodeCli", customizedSettings);

  assert.equal(modelInfo.modelId, "sonnet");
  assert.equal(modelInfo.reasoning, "high");
});

test("buildModelInfo preserves explicit Claude effective reasoning identity", () => {
  const modelInfo = buildModelInfo(
    "claudeCodeCli",
    null,
    "sonnet reasoning:max"
  );

  assert.equal(modelInfo.modelDisplayName, "Sonnet");
  assert.equal(modelInfo.reasoning, "max");
});

test("buildModelInfoFromBinding marks session-scoped identity as binding-owned", () => {
  const modelInfo = buildModelInfoFromBinding(
    {
      providerId: "codexCli",
      baseModelId: "gpt-5.3-codex",
      modelId: "gpt-5.3-codex reasoning:xhigh",
      reasoningEffort: "xhigh",
    },
    createDefaultSettings()
  );

  assert.equal(modelInfo.modelId, "gpt-5.3-codex reasoning:xhigh");
  assert.equal(modelInfo.modelDisplayName, "GPT 5.3 Codex");
  assert.equal(modelInfo.reasoning, "xhigh");
  assert.equal(modelInfo.source, "binding");
});

test("buildModelInfo shows OpenRouter slug and endpoint tag from settings", () => {
  const settings = createDefaultSettings();
  const modelInfo = buildModelInfo("openRouter", {
    ...settings,
    providers: {
      ...settings.providers,
      openRouter: {
        apiKey: "",
        baseUrl: "https://openrouter.ai/api/v1",
        defaultModel: "openai/gpt-5-nano",
        endpointTag: "azure/swedencentral",
      },
    },
  });

  assert.equal(modelInfo.modelDisplayName, "openai/gpt-5-nano");
  assert.equal(modelInfo.endpointTag, "azure/swedencentral");
});

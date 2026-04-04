import assert from "node:assert/strict";
import test from "node:test";
import type { ClaudeThinkingEffort } from "../../../../types/claude-model-registry";
import { createDefaultSettings } from "../components/settings/settings-state-model";
import { buildModelInfo } from "./model-info-builder";

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

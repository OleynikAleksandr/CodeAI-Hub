import assert from "node:assert/strict";
import test from "node:test";
import type { Settings } from "../../../ui/src/components/settings/settings-state-model";
import { createDefaultSettings } from "../../../ui/src/components/settings/settings-state-model";
import { SessionModelSwitchController } from "./session-model-switch-controller";

const createHarness = () => {
  const savedSettings: Settings[] = [];
  const modelUpdates: Array<{
    readonly sessionId: string;
    readonly targetReasoningId?: string | null;
    readonly targetModelId: string;
  }> = [];
  const controller = new SessionModelSwitchController({
    saveSettings: (settings) => {
      savedSettings.push(settings);
    },
    setSessionModel: (sessionId, targetModelId, targetReasoningId) => {
      modelUpdates.push({ sessionId, targetModelId, targetReasoningId });
    },
  });

  return { controller, modelUpdates, savedSettings };
};

test("SessionModelSwitchController saves Codex model and updates active session binding", () => {
  const { controller, modelUpdates, savedSettings } = createHarness();

  const result = controller.selectModel({
    modelId: "gpt-5.4-mini",
    providerId: "codexCli",
    sessionId: "session-1",
    settings: createDefaultSettings(),
  });

  assert.ok(result);
  assert.equal(result.targetModelId, "gpt-5.4-mini");
  assert.equal(savedSettings.length, 1);
  assert.equal(savedSettings[0]?.providers.codex.defaultModel, "gpt-5.4-mini");
  assert.deepEqual(modelUpdates, [
    {
      sessionId: "session-1",
      targetModelId: "gpt-5.4-mini",
      targetReasoningId:
        savedSettings[0]?.providers.codex.reasoningByModel["gpt-5.4-mini"],
    },
  ]);
});

test("SessionModelSwitchController saves Codex reasoning for the current model", () => {
  const { controller, modelUpdates, savedSettings } = createHarness();

  const result = controller.selectReasoning({
    modelId: "gpt-5.3-codex-spark",
    providerId: "codexCli",
    reasoningId: "xhigh",
    sessionId: "session-2",
    settings: createDefaultSettings(),
  });

  assert.ok(result);
  assert.equal(
    savedSettings[0]?.providers.codex.reasoningByModel["gpt-5.3-codex-spark"],
    "xhigh"
  );
  assert.deepEqual(modelUpdates, [
    {
      sessionId: "session-2",
      targetModelId: "gpt-5.3-codex-spark",
      targetReasoningId: "xhigh",
    },
  ]);
});

test("SessionModelSwitchController saves Claude thinking off without losing effort", () => {
  const { controller, modelUpdates, savedSettings } = createHarness();
  const settings = createDefaultSettings();

  const result = controller.selectReasoning({
    modelId: "opus",
    providerId: "claudeCodeCli",
    reasoningId: "off",
    sessionId: "session-3",
    settings: {
      ...settings,
      providers: {
        ...settings.providers,
        claude: {
          ...settings.providers.claude,
          thinking: { enabled: true, effort: "xhigh" },
        },
      },
    },
  });

  assert.ok(result);
  assert.equal(savedSettings[0]?.providers.claude.thinking.enabled, false);
  assert.equal(savedSettings[0]?.providers.claude.thinking.effort, "xhigh");
  assert.deepEqual(modelUpdates, [
    { sessionId: "session-3", targetModelId: "opus", targetReasoningId: "off" },
  ]);
});

test("SessionModelSwitchController saves Gemini thinking for the current model", () => {
  const { controller, modelUpdates, savedSettings } = createHarness();

  const result = controller.selectReasoning({
    modelId: "gemini-3-flash-preview",
    providerId: "geminiCli",
    reasoningId: "medium",
    sessionId: "session-4",
    settings: createDefaultSettings(),
  });

  assert.ok(result);
  assert.equal(
    savedSettings[0]?.providers.gemini.thinkingLevelByModel[
      "gemini-3-flash-preview"
    ],
    "medium"
  );
  assert.deepEqual(modelUpdates, [
    {
      sessionId: "session-4",
      targetModelId: "gemini-3-flash-preview",
      targetReasoningId: "medium",
    },
  ]);
});

test("SessionModelSwitchController ignores empty selections", () => {
  const { controller, modelUpdates, savedSettings } = createHarness();

  const result = controller.selectModel({
    modelId: " ",
    providerId: "codexCli",
    sessionId: "session-5",
    settings: createDefaultSettings(),
  });

  assert.equal(result, null);
  assert.equal(savedSettings.length, 0);
  assert.equal(modelUpdates.length, 0);
});

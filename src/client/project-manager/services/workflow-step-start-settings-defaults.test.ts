import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultSettings, type Settings } from "../../ui/src/components/settings/settings-state-model";
import {
  getStartCardReasoningOptions,
  resolveDefaultStartCardModelSelection,
} from "../components/shared/stage-start-model-selection";
import { applyStartCardModelDefaults } from "./workflow-step-start-settings-defaults";

const requireSettings = (settings: Settings | null): Settings => {
  assert.notEqual(settings, null);
  return settings as Settings;
};

test("start-card exposes GLM native reasoning options and no Kimi reasoning", () => {
  assert.deepEqual(
    getStartCardReasoningOptions("kimiCode", "kimi-k2.7-code").map(
      (option) => option.id
    ),
    []
  );
  assert.deepEqual(
    getStartCardReasoningOptions("glmNative", "glm-5.2").map(
      (option) => option.id
    ),
    ["max", "high", "off"]
  );
});

test("start-card defaults reflect stored Kimi model and GLM native reasoning", () => {
  const baseSettings = createDefaultSettings();
  const baseGlmNative = baseSettings.providers.glmNative;
  const baseKimi = baseSettings.providers.kimi;
  assert.ok(baseGlmNative);
  assert.ok(baseKimi);

  const settings: Settings = {
    ...baseSettings,
    providers: {
      ...baseSettings.providers,
      glmNative: {
        ...baseGlmNative,
        reasoningEffort: "high",
        thinkingEnabled: true,
      },
      kimi: {
        ...baseKimi,
        defaultModel: "kimi-k2.7-code-highspeed",
        thinkingEnabled: false,
      },
    },
  };

  assert.deepEqual(
    resolveDefaultStartCardModelSelection({ settings }, "kimiCode"),
    {
      modelId: "kimi-k2.7-code-highspeed",
      reasoning: "default",
    }
  );
  assert.deepEqual(
    resolveDefaultStartCardModelSelection({ settings }, "glmNative"),
    {
      modelId: "glm-5.2",
      reasoning: "high",
    }
  );
});

test("start-card selection persists Kimi model and GLM native reasoning settings", () => {
  const baseSettings = createDefaultSettings();

  const kimiHighspeed = requireSettings(
    applyStartCardModelDefaults(baseSettings, {
      modelId: "kimi-k2.7-code-highspeed",
      providerId: "kimiCode",
      reasoning: "off",
    })
  );
  assert.equal(kimiHighspeed.providers.kimi?.defaultModel, "kimi-k2.7-code-highspeed");
  assert.equal(kimiHighspeed.providers.kimi?.thinkingEnabled, true);

  assert.equal(
    applyStartCardModelDefaults(kimiHighspeed, {
      modelId: "kimi-k2.7-code-highspeed",
      providerId: "kimiCode",
      reasoning: "off",
    }),
    null
  );

  const glmHigh = requireSettings(
    applyStartCardModelDefaults(kimiHighspeed, {
      modelId: "glm-5.2",
      providerId: "glmNative",
      reasoning: "high",
    })
  );
  assert.equal(glmHigh.providers.glmNative?.thinkingEnabled, true);
  assert.equal(glmHigh.providers.glmNative?.reasoningEffort, "high");

  const glmOff = requireSettings(
    applyStartCardModelDefaults(glmHigh, {
      modelId: "glm-5.2",
      providerId: "glmNative",
      reasoning: "off",
    })
  );
  assert.equal(glmOff.providers.glmNative?.thinkingEnabled, false);
  assert.equal(glmOff.providers.glmNative?.reasoningEffort, "high");

  const glmMax = requireSettings(
    applyStartCardModelDefaults(glmOff, {
      modelId: "glm-5.2",
      providerId: "glmNative",
      reasoning: "max",
    })
  );
  assert.equal(glmMax.providers.glmNative?.thinkingEnabled, true);
  assert.equal(glmMax.providers.glmNative?.reasoningEffort, "max");
});

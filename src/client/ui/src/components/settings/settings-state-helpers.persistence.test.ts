import assert from "node:assert/strict";
import test from "node:test";
import { serializeSettingsForPersistence } from "./settings-state-helpers";
import {
  createDefaultSettings,
  mapSettingsSnapshot,
  type RawSettingsSnapshot,
} from "./settings-state-model";

test("settings persistence payload writes localization engine under global uiEngineId", () => {
  const settings = createDefaultSettings();
  const payload = serializeSettingsForPersistence({
    ...settings,
    general: {
      ...settings.general,
      localization: {
        ...settings.general.localization,
        engineId: "codex-gpt-5.4-mini",
      },
    },
  });

  assert.equal(payload.general?.localization?.uiEngineId, "codex-gpt-5.4-mini");
  assert.equal(
    "engineId" in (payload.general?.localization ?? {}),
    false,
    "persisted localization payload should use the global uiEngineId key"
  );
  assert.equal(
    (payload as RawSettingsSnapshot).providers?.claude?.defaultModel,
    settings.providers.claude.defaultModel
  );
});

test("settings persistence round-trips LM Studio local translation engine ids", () => {
  const localEngineId = "lmstudio:mlx-community/gemma-4-26b-a4b-it";
  const settings = mapSettingsSnapshot({
    general: {
      localization: {
        reasoningEngineId: localEngineId,
        uiEngineId: localEngineId,
      },
    },
  });
  const payload = serializeSettingsForPersistence(settings);
  const remapped = mapSettingsSnapshot(payload);

  assert.equal(settings.general.localization.engineId, localEngineId);
  assert.equal(settings.general.localization.reasoningEngineId, localEngineId);
  assert.equal(payload.general?.localization?.uiEngineId, localEngineId);
  assert.equal(payload.general?.localization?.reasoningEngineId, localEngineId);
  assert.equal(remapped.general.localization.engineId, localEngineId);
  assert.equal(remapped.general.localization.reasoningEngineId, localEngineId);
});

test("settings mapping upgrades legacy GLM-Claude-Code aliases", () => {
  const settings = mapSettingsSnapshot({
    providers: {
      glmClaudeCode: {
        defaultModel: "glm-5.1",
        haikuModel: "glm-4.5-air",
        opusModel: "glm-5.1",
        sonnetModel: "glm-5-turbo",
      },
    },
  });

  assert.equal(settings.providers.glmClaudeCode?.defaultModel, "glm-5.2");
  assert.equal(settings.providers.glmClaudeCode?.haikuModel, "glm-5.2");
  assert.equal(settings.providers.glmClaudeCode?.opusModel, "glm-5.2");
  assert.equal(settings.providers.glmClaudeCode?.sonnetModel, "glm-5.2");
});

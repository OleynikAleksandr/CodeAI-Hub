import assert from "node:assert/strict";
import test from "node:test";
import { serializeSettingsForPersistence } from "./settings-state-helpers";
import {
  createDefaultSettings,
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

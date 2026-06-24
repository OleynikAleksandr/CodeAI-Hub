import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultSettings,
  mapSettingsSnapshot,
} from "./settings-state-model";

test("Settings UI defaults provider auto-update toggles to off", () => {
  const settings = createDefaultSettings();

  assert.equal(settings.providers.claude.autoUpdate.enabled, false);
  assert.equal(settings.providers.codex.autoUpdate.enabled, false);
});

test("Settings UI preserves explicit provider auto-update opt-in", () => {
  const settings = mapSettingsSnapshot({
    providers: {
      claude: { autoUpdate: { enabled: true } },
      codex: { autoUpdate: { enabled: true } },
    },
  });

  assert.equal(settings.providers.claude.autoUpdate.enabled, true);
  assert.equal(settings.providers.codex.autoUpdate.enabled, true);
});

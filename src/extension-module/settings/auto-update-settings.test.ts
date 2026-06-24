import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_AUTO_UPDATE_SETTINGS,
  normalizeAutoUpdateSettings,
} from "./auto-update-settings";
import { DEFAULT_SETTINGS_SNAPSHOT } from "./types";

test("default provider settings keep auto-update disabled", () => {
  assert.equal(DEFAULT_AUTO_UPDATE_SETTINGS.enabled, false);
  assert.equal(
    DEFAULT_SETTINGS_SNAPSHOT.providers.claude.autoUpdate.enabled,
    false
  );
  assert.equal(
    DEFAULT_SETTINGS_SNAPSHOT.providers.codex.autoUpdate.enabled,
    false
  );
});

test("normalizeAutoUpdateSettings requires an explicit opt-in", () => {
  assert.deepEqual(normalizeAutoUpdateSettings(undefined), { enabled: false });
  assert.deepEqual(normalizeAutoUpdateSettings({}), { enabled: false });
  assert.deepEqual(normalizeAutoUpdateSettings({ enabled: true }), {
    enabled: true,
  });
});

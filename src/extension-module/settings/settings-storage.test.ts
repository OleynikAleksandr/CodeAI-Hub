import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  applyDefaultModelsEnv,
  loadSettingsSnapshot,
  persistSettingsSnapshot,
} from "./settings-storage";
import { DEFAULT_SETTINGS_SNAPSHOT } from "./types";

const LEGACY_SETTINGS_FILE = path.join(
  homedir(),
  ".codeai-hub",
  "settings",
  "settings.json"
);

const readLegacyFileState = async (): Promise<string | null> => {
  try {
    const info = await stat(LEGACY_SETTINGS_FILE);
    const content = await readFile(LEGACY_SETTINGS_FILE, "utf8");
    return `${info.mtimeMs}:${content}`;
  } catch {
    return null;
  }
};

test("extension settings storage uses in-code defaults without mutating legacy global settings", async () => {
  const before = await readLegacyFileState();
  const snapshot = loadSettingsSnapshot();

  assert.deepEqual(snapshot, DEFAULT_SETTINGS_SNAPSHOT);
  await persistSettingsSnapshot({
    ...DEFAULT_SETTINGS_SNAPSHOT,
    providers: {
      ...DEFAULT_SETTINGS_SNAPSHOT.providers,
      codex: {
        ...DEFAULT_SETTINGS_SNAPSHOT.providers.codex,
        defaultModel: "gpt-5.5",
      },
    },
  });
  assert.equal(await readLegacyFileState(), before);
});

test("extension settings storage does not export legacy settings path to Core env", () => {
  const previousSettingsPath = process.env.CLAUDE_SETTINGS_PATH;
  const previousCodexModel = process.env.CODEX_DEFAULT_MODEL;
  try {
    process.env.CLAUDE_SETTINGS_PATH = LEGACY_SETTINGS_FILE;
    process.env.CODEX_DEFAULT_MODEL = "preserve-me";

    applyDefaultModelsEnv(DEFAULT_SETTINGS_SNAPSHOT);

    assert.equal(process.env.CLAUDE_SETTINGS_PATH, undefined);
    assert.equal(process.env.CODEX_DEFAULT_MODEL, "preserve-me");
  } finally {
    if (previousSettingsPath === undefined) {
      Reflect.deleteProperty(process.env, "CLAUDE_SETTINGS_PATH");
    } else {
      process.env.CLAUDE_SETTINGS_PATH = previousSettingsPath;
    }
    if (previousCodexModel === undefined) {
      Reflect.deleteProperty(process.env, "CODEX_DEFAULT_MODEL");
    } else {
      process.env.CODEX_DEFAULT_MODEL = previousCodexModel;
    }
  }
});

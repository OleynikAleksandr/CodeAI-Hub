import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveCodexReasoningSummaryMode } from "./codex-reasoning-summary-settings";

const withTemporarySettingsPath = async (
  settingsPayload: string,
  run: () => Promise<void> | void
): Promise<void> => {
  const root = await mkdtemp(path.join(tmpdir(), "codex-settings-"));
  const settingsPath = path.join(root, "settings.json");
  const previousSettingsPath = process.env.CLAUDE_SETTINGS_PATH;

  await writeFile(settingsPath, settingsPayload, "utf8");
  process.env.CLAUDE_SETTINGS_PATH = settingsPath;

  try {
    await run();
  } finally {
    if (previousSettingsPath) {
      process.env.CLAUDE_SETTINGS_PATH = previousSettingsPath;
    } else {
      process.env.CLAUDE_SETTINGS_PATH = undefined;
    }
  }
};

test("resolveCodexReasoningSummaryMode returns none from reasoningSummaryEnabled false", async () => {
  await withTemporarySettingsPath(
    JSON.stringify({
      providers: {
        codex: {
          reasoningSummaryEnabled: false,
        },
      },
    }),
    () => {
      assert.equal(resolveCodexReasoningSummaryMode(), "none");
    }
  );
});

test("resolveCodexReasoningSummaryMode falls back to legacy thinkingDisplaySyncEnabled", async () => {
  await withTemporarySettingsPath(
    JSON.stringify({
      providers: {
        codex: {
          thinkingDisplaySyncEnabled: false,
        },
      },
    }),
    () => {
      assert.equal(resolveCodexReasoningSummaryMode(), "none");
    }
  );
});

test("resolveCodexReasoningSummaryMode defaults to auto", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "codex-settings-missing-"));
  const missingSettingsPath = path.join(root, "missing-settings.json");
  const previousSettingsPath = process.env.CLAUDE_SETTINGS_PATH;
  process.env.CLAUDE_SETTINGS_PATH = missingSettingsPath;

  try {
    assert.equal(resolveCodexReasoningSummaryMode(), "auto");
  } finally {
    if (previousSettingsPath) {
      process.env.CLAUDE_SETTINGS_PATH = previousSettingsPath;
    } else {
      process.env.CLAUDE_SETTINGS_PATH = undefined;
    }
  }
});

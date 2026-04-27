import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  materializeCodexProviderHomeSummaryConfig,
  normalizeCodexProviderHomeConfigToml,
} from "./codex-provider-home-config";

const MODEL_REASONING_SUMMARY_AUTO_LINE_REGEX =
  /model_reasoning_summary = "auto"/u;
const MODEL_REASONING_SUMMARY_NONE_LINE_REGEX =
  /model_reasoning_summary = "none"/u;

test("normalizeCodexProviderHomeConfigToml inserts auto summary before sections", () => {
  assert.equal(
    normalizeCodexProviderHomeConfigToml(
      'model = "gpt-5.3-codex-spark"\n\n[features]\napps = true\n',
      "auto"
    ),
    'model = "gpt-5.3-codex-spark"\nmodel_reasoning_summary = "auto"\n[features]\napps = true\n'
  );
});

test("normalizeCodexProviderHomeConfigToml replaces model summary and removes legacy summary", () => {
  assert.equal(
    normalizeCodexProviderHomeConfigToml(
      'default_reasoning_summary = "none"\nmodel_reasoning_effort = "xhigh"\nmodel_reasoning_summary = "none"\n',
      "auto"
    ),
    'model_reasoning_effort = "xhigh"\nmodel_reasoning_summary = "auto"\n'
  );
});

test("materializeCodexProviderHomeSummaryConfig follows shared Codex reasoning toggle", async () => {
  const previousCodeSettingsPath = process.env.CODEX_SETTINGS_PATH;
  const previousClaudeSettingsPath = process.env.CLAUDE_SETTINGS_PATH;
  const tempDir = await mkdtemp(path.join(tmpdir(), "codex-home-config-"));
  const settingsPath = path.join(tempDir, "settings.json");
  const providerHome = path.join(tempDir, "codex-home");
  process.env.CODEX_SETTINGS_PATH = settingsPath;
  process.env.CLAUDE_SETTINGS_PATH = undefined;

  try {
    await writeFile(
      settingsPath,
      JSON.stringify({
        providers: {
          codex: {
            reasoningSummaryEnabled: false,
          },
        },
      }),
      "utf8"
    );
    await materializeCodexProviderHomeSummaryConfig(providerHome);
    assert.match(
      await readFile(path.join(providerHome, "config.toml"), "utf8"),
      MODEL_REASONING_SUMMARY_NONE_LINE_REGEX
    );

    await writeFile(
      settingsPath,
      JSON.stringify({
        providers: {
          codex: {
            reasoningSummaryEnabled: true,
          },
        },
      }),
      "utf8"
    );
    await materializeCodexProviderHomeSummaryConfig(providerHome);
    assert.match(
      await readFile(path.join(providerHome, "config.toml"), "utf8"),
      MODEL_REASONING_SUMMARY_AUTO_LINE_REGEX
    );
  } finally {
    if (previousCodeSettingsPath === undefined) {
      process.env.CODEX_SETTINGS_PATH = undefined;
    } else {
      process.env.CODEX_SETTINGS_PATH = previousCodeSettingsPath;
    }
    if (previousClaudeSettingsPath === undefined) {
      process.env.CLAUDE_SETTINGS_PATH = undefined;
    } else {
      process.env.CLAUDE_SETTINGS_PATH = previousClaudeSettingsPath;
    }
  }
});

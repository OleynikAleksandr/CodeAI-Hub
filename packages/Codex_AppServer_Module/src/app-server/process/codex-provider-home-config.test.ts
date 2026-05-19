import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  materializeCodexProviderHomeSummaryConfig,
  materializeKimiCodexProviderHomeConfig,
  normalizeCodexProviderHomeConfigToml,
  normalizeKimiCodexProviderHomeConfigToml,
} from "./codex-provider-home-config";

const MODEL_REASONING_SUMMARY_AUTO_LINE_REGEX =
  /model_reasoning_summary = "auto"/u;
const MODEL_REASONING_SUMMARY_NONE_LINE_REGEX =
  /model_reasoning_summary = "none"/u;
const KIMI_CODEX_MODEL_LINE_REGEX = /^model = "kimi-for-coding"$/mu;
const KIMI_CODEX_MODEL_PROVIDER_LINE_REGEX = /^model_provider = "kimi"$/mu;
const KIMI_CODEX_PROVIDER_SECTION_REGEX = /^\[model_providers\.kimi\]$/mu;
const KIMI_CODEX_BASE_URL_LINE_REGEX =
  /^base_url = "https:\/\/api\.kimi\.com\/coding\/v1"$/mu;
const KIMI_CODEX_ENV_KEY_LINE_REGEX = /^env_key = "KIMI_API_KEY"$/mu;
const KIMI_CODEX_WIRE_API_LINE_REGEX = /^wire_api = "chat"$/mu;
const FEATURES_SECTION_LINE_REGEX = /^\[features\]$/mu;
const OLD_KIMI_BASE_URL_LINE_REGEX = /example\.invalid/u;
const OLD_KIMI_NAME_LINE_REGEX = /Old Kimi/u;

test("normalizeCodexProviderHomeConfigToml inserts neutral summary before sections", () => {
  assert.equal(
    normalizeCodexProviderHomeConfigToml(
      'model = "gpt-5.3-codex-spark"\n\n[features]\napps = true\n'
    ),
    'model = "gpt-5.3-codex-spark"\nmodel_reasoning_summary = "none"\n[features]\napps = true\n'
  );
});

test("normalizeCodexProviderHomeConfigToml replaces model summary and removes legacy summary", () => {
  assert.equal(
    normalizeCodexProviderHomeConfigToml(
      'default_reasoning_summary = "auto"\nmodel_reasoning_effort = "xhigh"\nmodel_reasoning_summary = "auto"\n'
    ),
    'model_reasoning_effort = "xhigh"\nmodel_reasoning_summary = "none"\n'
  );
});

test("materializeCodexProviderHomeSummaryConfig always neutralizes provider-home summary", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "codex-home-config-"));
  const providerHome = path.join(tempDir, "codex-home");

  await materializeCodexProviderHomeSummaryConfig(providerHome);
  const firstConfigPath = path.join(providerHome, "config.toml");
  const firstConfig = await readFile(firstConfigPath, "utf8");
  assert.match(firstConfig, MODEL_REASONING_SUMMARY_NONE_LINE_REGEX);
  assert.doesNotMatch(firstConfig, MODEL_REASONING_SUMMARY_AUTO_LINE_REGEX);

  await writeFile(
    firstConfigPath,
    'model_reasoning_summary = "auto"\n',
    "utf8"
  );
  await materializeCodexProviderHomeSummaryConfig(providerHome);
  const rewrittenConfig = await readFile(firstConfigPath, "utf8");
  assert.match(rewrittenConfig, MODEL_REASONING_SUMMARY_NONE_LINE_REGEX);
  assert.doesNotMatch(rewrittenConfig, MODEL_REASONING_SUMMARY_AUTO_LINE_REGEX);
});

test("normalizeKimiCodexProviderHomeConfigToml pins Kimi model and provider", () => {
  const normalized = normalizeKimiCodexProviderHomeConfigToml(
    [
      'model = "gpt-5.5"',
      'model_provider = "openai"',
      'model_reasoning_summary = "auto"',
      "",
      "[model_providers.kimi]",
      'name = "Old Kimi"',
      'base_url = "https://example.invalid"',
      "",
      "[features]",
      "apps = true",
    ].join("\n")
  );

  assert.match(normalized, KIMI_CODEX_MODEL_LINE_REGEX);
  assert.match(normalized, KIMI_CODEX_MODEL_PROVIDER_LINE_REGEX);
  assert.match(normalized, MODEL_REASONING_SUMMARY_NONE_LINE_REGEX);
  assert.match(normalized, KIMI_CODEX_PROVIDER_SECTION_REGEX);
  assert.match(normalized, KIMI_CODEX_BASE_URL_LINE_REGEX);
  assert.match(normalized, KIMI_CODEX_ENV_KEY_LINE_REGEX);
  assert.match(normalized, KIMI_CODEX_WIRE_API_LINE_REGEX);
  assert.match(normalized, FEATURES_SECTION_LINE_REGEX);
  assert.doesNotMatch(normalized, OLD_KIMI_BASE_URL_LINE_REGEX);
  assert.doesNotMatch(normalized, OLD_KIMI_NAME_LINE_REGEX);
});

test("materializeKimiCodexProviderHomeConfig writes isolated Kimi-Codex home config", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "kimi-codex-home-config-"));
  const providerHome = path.join(tempDir, "kimi-codex-home");

  await materializeKimiCodexProviderHomeConfig(providerHome);
  const config = await readFile(path.join(providerHome, "config.toml"), "utf8");

  assert.match(config, KIMI_CODEX_MODEL_LINE_REGEX);
  assert.match(config, KIMI_CODEX_MODEL_PROVIDER_LINE_REGEX);
  assert.match(config, MODEL_REASONING_SUMMARY_NONE_LINE_REGEX);
  assert.match(config, KIMI_CODEX_PROVIDER_SECTION_REGEX);
});

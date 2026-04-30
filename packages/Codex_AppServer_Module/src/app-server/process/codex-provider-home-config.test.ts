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

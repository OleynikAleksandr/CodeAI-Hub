import assert from "node:assert/strict";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CodexProviderConfigMaterializer,
  materializeCodexProviderConfigToml,
} from "./codex-provider-config-materializer";

const MODEL_REASONING_SUMMARY_AUTO_REGEX = /model_reasoning_summary = "auto"/u;
const LEGACY_REASONING_SUMMARY_REGEX = /default_reasoning_summary/u;

test("materializeCodexProviderConfigToml adds provider reasoning summary override", () => {
  const { next } = materializeCodexProviderConfigToml(
    ['model = "gpt-5.4"', 'model_reasoning_effort = "xhigh"', ""].join("\n"),
    { modelReasoningSummary: "auto" }
  );

  assert.match(next, MODEL_REASONING_SUMMARY_AUTO_REGEX);
});

test("materializeCodexProviderConfigToml replaces legacy reasoning summary key", () => {
  const { next } = materializeCodexProviderConfigToml(
    [
      'model = "gpt-5.4"',
      'model_reasoning_effort = "xhigh"',
      'default_reasoning_summary = "auto"',
      "",
    ].join("\n"),
    { modelReasoningSummary: "auto" }
  );

  assert.match(next, MODEL_REASONING_SUMMARY_AUTO_REGEX);
  assert.doesNotMatch(next, LEGACY_REASONING_SUMMARY_REGEX);
});

test("config materializer keeps source config untouched and replaces provider symlink", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "codex-provider-config-"));
  const legacyCodexHome = path.join(root, "legacy");
  const providerCodexHome = path.join(root, "provider");
  const legacyConfigPath = path.join(legacyCodexHome, "config.toml");
  const providerConfigPath = path.join(providerCodexHome, "config.toml");

  await mkdir(legacyCodexHome, { recursive: true });
  await mkdir(providerCodexHome, { recursive: true });
  await writeFile(
    legacyConfigPath,
    ['model = "gpt-5.4"', 'model_reasoning_effort = "xhigh"', ""].join("\n"),
    "utf8"
  );
  await symlink(legacyConfigPath, providerConfigPath);

  const materializer = new CodexProviderConfigMaterializer({
    legacyCodexHome,
    overrides: { modelReasoningSummary: "auto" },
    providerCodexHome,
  });
  await materializer.ensureProviderConfigToml();

  const legacyRaw = await readFile(legacyConfigPath, "utf8");
  const providerRaw = await readFile(providerConfigPath, "utf8");
  const providerStats = await lstat(providerConfigPath);

  assert.doesNotMatch(legacyRaw, MODEL_REASONING_SUMMARY_AUTO_REGEX);
  assert.match(providerRaw, MODEL_REASONING_SUMMARY_AUTO_REGEX);
  assert.equal(providerStats.isSymbolicLink(), false);
});

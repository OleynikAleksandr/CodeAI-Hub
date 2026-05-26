import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  normalizeCodexProviderConfigToml,
  syncCodexProviderReasoningSummaryConfig,
} from "./codex-provider-config-sync";

test("normalizeCodexProviderConfigToml keeps provider-home summary neutral while syncing model", () => {
  assert.equal(
    normalizeCodexProviderConfigToml(
      'default_reasoning_summary = "auto"\nmodel = "gpt-5.2"\nmodel_reasoning_effort = "low"\nmodel_reasoning_summary = "auto"\n[features]\napps = true\n',
      "gpt-5.3-codex-spark"
    ),
    'model = "gpt-5.3-codex-spark"\nmodel_reasoning_effort = "low"\nmodel_reasoning_summary = "none"\n[features]\napps = true\n'
  );
});

test("syncCodexProviderReasoningSummaryConfig writes workspace provider home", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "codeai-codex-config-"));
  const workspaceRoot = path.join(tempRoot, "Workspace Name");
  const legacyCodexHome = path.join(tempRoot, ".codex");
  await mkdir(legacyCodexHome, { recursive: true });

  await syncCodexProviderReasoningSummaryConfig(true, {
    legacyCodexHome,
    workspaceRoot,
  });

  const workspaceConfigPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    "workspace-name",
    "runtime",
    "providers",
    "codex",
    "home",
    "config.toml"
  );
  assert.equal(
    await readFile(workspaceConfigPath, "utf8"),
    'model_reasoning_summary = "none"\n'
  );
});

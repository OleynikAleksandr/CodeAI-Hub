import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCodexProviderConfigToml } from "./codex-provider-config-sync";

test("normalizeCodexProviderConfigToml keeps provider-home summary neutral while syncing model", () => {
  assert.equal(
    normalizeCodexProviderConfigToml(
      'default_reasoning_summary = "auto"\nmodel = "gpt-5.2"\nmodel_reasoning_effort = "low"\nmodel_reasoning_summary = "auto"\n[features]\napps = true\n',
      "gpt-5.3-codex-spark"
    ),
    'model = "gpt-5.3-codex-spark"\nmodel_reasoning_effort = "low"\nmodel_reasoning_summary = "none"\n[features]\napps = true\n'
  );
});

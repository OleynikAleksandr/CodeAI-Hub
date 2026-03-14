import assert from "node:assert/strict";
import test from "node:test";
import { resolvePreferredCodexDefaultModel } from "./index";

test("resolvePreferredCodexDefaultModel prefers saved settings over stale env", () => {
  const model = resolvePreferredCodexDefaultModel({
    settingsDefaultModel: "gpt-5.4",
    envDefaultModel: "gpt-5.3-codex",
    fallbackModel: "gpt-5.3-codex",
  });

  assert.equal(model, "gpt-5.4");
});

test("resolvePreferredCodexDefaultModel falls back to env when settings are absent", () => {
  const model = resolvePreferredCodexDefaultModel({
    envDefaultModel: "gpt-5.4",
    fallbackModel: "gpt-5.3-codex",
  });

  assert.equal(model, "gpt-5.4");
});

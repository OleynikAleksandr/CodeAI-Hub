import assert from "node:assert/strict";
import test from "node:test";
import { resolvePreferredCodexDefaultModel } from "./codex-sdk-manager";

test("resolvePreferredCodexDefaultModel prefers settings snapshot over stale env", () => {
  const model = resolvePreferredCodexDefaultModel({
    settingsDefaultModel: "gpt-5.4",
    envDefaultModel: "gpt-5.3-codex",
    fallbackModel: "gpt-5.3-codex",
  });

  assert.equal(model, "gpt-5.4");
});

test("resolvePreferredCodexDefaultModel falls back to workspace default", () => {
  const model = resolvePreferredCodexDefaultModel({
    fallbackModel: "gpt-5.3-codex",
  });

  assert.equal(model, "gpt-5.3-codex");
});

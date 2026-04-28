import assert from "node:assert/strict";
import test from "node:test";
import {
  ModelInvocationProfileResolver,
  normalizeModelInvocationPurpose,
} from "./model-invocation-profile-resolver";

test("ModelInvocationProfileResolver keeps diagnostic out of invocation purposes", () => {
  assert.equal(
    normalizeModelInvocationPurpose("workflow-agent"),
    "workflow-agent"
  );
  assert.equal(normalizeModelInvocationPurpose("translation"), "translation");
  assert.equal(normalizeModelInvocationPurpose("diagnostic"), null);
});

test("ModelInvocationProfileResolver resolves Codex Spark translation without explicit summary", () => {
  const profile = new ModelInvocationProfileResolver().resolve({
    modelId: "gpt-5.3-codex-spark",
    providerId: "codex",
    purpose: "translation",
  });

  assert.equal(profile.processProfile.processProfileKey, "codex:translation");
  assert.equal(profile.sessionProfile.persistExtendedHistory, false);
  assert.equal(profile.turnProfile.effort, "low");
  assert.equal(profile.turnProfile.omitSummary, true);
  assert.equal(profile.turnProfile.summary, null);
});

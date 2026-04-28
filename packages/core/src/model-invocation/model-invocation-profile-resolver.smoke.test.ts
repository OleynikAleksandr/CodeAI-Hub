import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ModelInvocationInstructionLoader } from "./model-invocation-instruction-loader";
import {
  ModelInvocationProfileResolver,
  normalizeModelInvocationPurpose,
} from "./model-invocation-profile-resolver";

const resolver = new ModelInvocationProfileResolver();
const REQUIRES_STEP_ID_PATTERN = /requires stepId/;

test("ModelInvocationProfileResolver keeps diagnostic out of invocation purposes", () => {
  assert.equal(
    normalizeModelInvocationPurpose("workflow-agent"),
    "workflow-agent"
  );
  assert.equal(normalizeModelInvocationPurpose("translation"), "translation");
  assert.equal(normalizeModelInvocationPurpose("diagnostic"), null);
});

test("ModelInvocationProfileResolver resolves documentation workflow step profiles", () => {
  const profile = resolver.resolve({
    modelId: "gpt-5.5",
    providerId: "codex",
    purpose: "workflow-agent",
    stepId: "virtual_simulation",
    tree: "documentation",
  });

  assert.equal(
    profile.processProfile.processProfileKey,
    "codex:workflow-documentation"
  );
  assert.equal(
    profile.sessionProfile.sessionProfileKey,
    "codex:workflow-documentation:virtual_simulation"
  );
  assert.equal(profile.sessionProfile.persistExtendedHistory, true);
  assert.deepEqual(profile.sessionProfile.config, {
    project_doc_max_bytes: 0,
  });
  assert.deepEqual(
    profile.sessionProfile.instructionFragments.map((fragment) => fragment.key),
    [
      "codex:early-architecture-system-prompt",
      "invocation/codex/workflow-agent.system.md",
      "workflow_steps/documentation/virtual_simulation.system.md",
    ]
  );
  assert.equal(profile.compatibleModelIds.includes("gpt-5.2"), true);
  assert.equal(profile.compatibleModelIds.includes("gpt-5.5"), true);
});

test("ModelInvocationProfileResolver rejects workflow-agent profiles without a step", () => {
  assert.throws(
    () =>
      resolver.resolve({
        modelId: "gpt-5.4-mini",
        providerId: "codex",
        purpose: "workflow-agent",
      }),
    REQUIRES_STEP_ID_PATTERN
  );
});

test("ModelInvocationProfileResolver resolves Codex non-Spark translation summary settings", () => {
  const profile = resolver.resolve({
    modelId: "gpt-5.4-mini",
    providerId: "codex",
    purpose: "translation",
  });

  assert.equal(profile.processProfile.approvalPolicy, "never");
  assert.equal(profile.processProfile.sandbox, "read-only");
  assert.equal(
    profile.processProfile.toolProfileKey,
    "codex:translation-tools-disabled"
  );
  assert.deepEqual(profile.compatibleModelIds, [
    "gpt-5.4-mini",
    "gpt-5.3-codex-spark",
  ]);
  assert.equal(profile.turnProfile.omitSummary, false);
  assert.equal(profile.turnProfile.summary, "none");
});

test("ModelInvocationProfileResolver resolves Codex Spark translation without explicit summary", () => {
  const profile = resolver.resolve({
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

test("ModelInvocationProfileResolver resolves provider-owned Claude translation profile", () => {
  const profile = resolver.resolve({
    modelId: "claude-haiku-4-5-20251001",
    providerId: "claude",
    purpose: "translation",
  });

  assert.equal(profile.processProfile.processProfileKey, "claude:translation");
  assert.equal(profile.sessionProfile.persistExtendedHistory, false);
  assert.deepEqual(profile.compatibleModelIds, ["claude-haiku-4-5-20251001"]);
  assert.deepEqual(
    profile.sessionProfile.instructionFragments.map((fragment) => fragment.key),
    ["invocation/claude/translation.system.md"]
  );
});

test("ModelInvocationInstructionLoader loads only user-template fragments", async () => {
  const templateRoot = await mkdtemp(path.join(os.tmpdir(), "invocation-"));
  try {
    const templatePath = path.join(
      templateRoot,
      "invocation/codex/translation.system.md"
    );
    await mkdir(path.dirname(templatePath), { recursive: true });
    await writeFile(templatePath, "Custom translation instructions\n", "utf8");

    const profile = resolver.resolve({
      modelId: "gpt-5.4-mini",
      providerId: "codex",
      purpose: "translation",
    });
    const fragments = await new ModelInvocationInstructionLoader({
      templateRoot,
    }).load(profile);

    assert.equal(fragments[0]?.status, "code-owned");
    assert.equal(fragments[0]?.content, undefined);
    assert.equal(fragments[1]?.status, "loaded");
    assert.equal(fragments[1]?.content, "Custom translation instructions");
  } finally {
    await rm(templateRoot, { recursive: true, force: true });
  }
});

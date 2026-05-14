import assert from "node:assert/strict";
import test from "node:test";
import { buildQualityGatesRepairFeedbackMessage } from "./quality-gates-contract-feedback";
import { evaluateQualityGatesContractGuard } from "./quality-gates-contract-guard";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

const buildProgress = (
  overrides: Partial<QualityGatesProgressSnapshot> = {}
): QualityGatesProgressSnapshot => ({
  accepted: false,
  commandContractReady: true,
  integrated: false,
  integrationState: "draft",
  jsonExists: true,
  markdownExists: true,
  substep: "awaiting_acceptance",
  validationErrors: [],
  ...overrides,
});

test("guard returns commit_ready when draft artifacts are complete", () => {
  const decision = evaluateQualityGatesContractGuard({
    ownedDirtyFiles: [
      ".codeai-hub/demo/quality_gates/quality-gates.md",
      ".codeai-hub/demo/quality_gates/quality-gates.json",
    ],
    phase: "phase_1_draft",
    progress: buildProgress(),
    terminalEventReceived: true,
  });

  assert.equal(decision.kind, "commit_ready");
});

test("guard returns repair_no_progress for terminal turn without owned diff", () => {
  const decision = evaluateQualityGatesContractGuard({
    ownedDirtyFiles: [],
    phase: "phase_1_draft",
    progress: buildProgress(),
    terminalEventReceived: true,
  });

  assert.equal(decision.kind, "repair_no_progress");
});

test("guard returns repair_invalid_draft when commands object is missing", () => {
  const decision = evaluateQualityGatesContractGuard({
    ownedDirtyFiles: [".codeai-hub/demo/quality_gates/quality-gates.json"],
    phase: "phase_1_draft",
    progress: buildProgress({ commandContractReady: false }),
    terminalEventReceived: true,
  });

  assert.equal(decision.kind, "repair_invalid_draft");
  if (decision.kind === "repair_invalid_draft") {
    assert.equal(
      decision.details.some((detail) => detail.includes("commands object")),
      true
    );
  }
});

test("guard returns repair_premature_integration when integration-owned paths change in draft", () => {
  const decision = evaluateQualityGatesContractGuard({
    ownedDirtyFiles: [
      ".codeai-hub/demo/quality_gates/quality-gates.md",
      ".codeai-hub/demo/quality_gates/scripts/run.mjs",
    ],
    phase: "phase_1_draft",
    progress: buildProgress(),
    terminalEventReceived: true,
  });

  assert.equal(decision.kind, "repair_premature_integration");
  if (decision.kind === "repair_premature_integration") {
    assert.deepEqual(decision.blockedPaths, [
      ".codeai-hub/demo/quality_gates/scripts/run.mjs",
    ]);
  }
});

test("guard returns noop for non-draft phases", () => {
  const decision = evaluateQualityGatesContractGuard({
    ownedDirtyFiles: [".codeai-hub/demo/quality_gates/quality-gates.md"],
    phase: "phase_3_integration",
    progress: buildProgress({
      accepted: true,
      integrationState: "in_progress",
    }),
    terminalEventReceived: true,
  });

  assert.equal(decision.kind, "noop");
  if (decision.kind === "noop") {
    assert.equal(decision.reason, "out_of_scope_phase");
  }
});

test("guard returns noop when no terminal event arrived", () => {
  const decision = evaluateQualityGatesContractGuard({
    ownedDirtyFiles: [],
    phase: "phase_1_draft",
    progress: buildProgress(),
    terminalEventReceived: false,
  });

  assert.equal(decision.kind, "noop");
  if (decision.kind === "noop") {
    assert.equal(decision.reason, "no_terminal_event");
  }
});

test("feedback builder asks for concrete repairs rather than silence", () => {
  const repairNoProgress = buildQualityGatesRepairFeedbackMessage({
    kind: "repair_no_progress",
    reason: "terminal_no_owned_diff_in_phase_1_draft",
  });
  assert.ok(repairNoProgress);
  assert.equal(repairNoProgress.includes("blocker note"), true);

  const repairInvalid = buildQualityGatesRepairFeedbackMessage({
    details: ["quality-gates.json is missing"],
    kind: "repair_invalid_draft",
    reason: "implicit_readiness_with_invalid_draft",
  });
  assert.ok(repairInvalid);
  assert.equal(repairInvalid.includes("Re-emit a complete"), true);

  const repairPremature = buildQualityGatesRepairFeedbackMessage({
    blockedPaths: [".husky/pre-commit"],
    kind: "repair_premature_integration",
    reason: "premature_integration_before_acceptance",
  });
  assert.ok(repairPremature);
  assert.equal(repairPremature.includes("Revert the integration"), true);

  const commitReady = buildQualityGatesRepairFeedbackMessage({
    kind: "commit_ready",
    reason: "draft_complete",
  });
  assert.equal(commitReady, null);
});

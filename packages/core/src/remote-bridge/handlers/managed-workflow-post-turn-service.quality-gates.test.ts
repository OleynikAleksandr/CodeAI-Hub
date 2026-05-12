import assert from "node:assert/strict";
import test from "node:test";
import { buildQualityGatesRepairFeedbackMessage } from "./quality-gates-contract-feedback";
import {
  evaluateQualityGatesContractGuard,
  type QualityGatesGuardDecision,
} from "./quality-gates-contract-guard";
import { classifyQualityGatesReviewTurn } from "./quality-gates-review-turn-classifier";

test("guard escalates a draft turn without owned diff to repair_no_progress", () => {
  const decision = evaluateQualityGatesContractGuard({
    ownedDirtyFiles: [],
    phase: "phase_1_draft",
    progress: null,
    terminalEventReceived: true,
  });
  assert.equal(decision.kind, "repair_no_progress");
});

test("repair feedback always asks for a concrete next step, never silence", () => {
  const decisions: QualityGatesGuardDecision[] = [
    {
      kind: "repair_no_progress",
      reason: "terminal_no_owned_diff_in_phase_1_draft",
    },
    {
      details: ["quality-gates.json is missing"],
      kind: "repair_invalid_draft",
      reason: "implicit_readiness_with_invalid_draft",
    },
    {
      blockedPaths: ["package.json"],
      kind: "repair_premature_integration",
      reason: "premature_integration_before_acceptance",
    },
  ];
  for (const decision of decisions) {
    const message = buildQualityGatesRepairFeedbackMessage(decision);
    assert.ok(message);
    assert.equal(
      message.includes("do nothing"),
      false,
      `feedback for ${decision.kind} must not tell the agent to do nothing`
    );
  }
});

test("review classifier records revision intent for repair retries that touch owned files", () => {
  const kind = classifyQualityGatesReviewTurn({
    ownedDirtyFiles: [".codeai-hub/demo/quality_gates/quality-gates.json"],
    phase: "phase_2_review",
  });
  assert.equal(kind, "revision");
});

test("guard accepts commit_ready only with complete draft owned diff", () => {
  const decision = evaluateQualityGatesContractGuard({
    ownedDirtyFiles: [
      ".codeai-hub/demo/quality_gates/quality-gates.md",
      ".codeai-hub/demo/quality_gates/quality-gates.json",
    ],
    phase: "phase_1_draft",
    progress: {
      accepted: false,
      acceptanceCommitted: false,
      commandContractReady: true,
      integrated: false,
      integrationState: "draft",
      jsonExists: true,
      markdownExists: true,
      substep: "awaiting_acceptance",
      validationErrors: [],
    },
    terminalEventReceived: true,
  });
  assert.equal(decision.kind, "commit_ready");
});

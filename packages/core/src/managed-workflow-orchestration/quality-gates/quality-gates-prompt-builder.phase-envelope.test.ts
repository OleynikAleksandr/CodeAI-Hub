import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQualityGatesContractDraftPrompt,
  buildQualityGatesIntegrationPrompt,
  buildQualityGatesIntegrationRepairPrompt,
  buildQualityGatesVerificationRepairPrompt,
} from "./quality-gates-prompt-builder";

const WORKSPACE_SLUG = "demo-workspace";
const PHASE2_DRAFT_RE = /Core opens Phase 2 Quality Gates Contract Draft/u;
const PHASE3_INTEGRATION_RE = /Core opens Phase 3 Quality Gates Integration/u;
const PHASE3_REPAIR_RE = /Core opens Phase 3 Quality Gates Integration Repair/u;
const PHASE4_REPAIR_RE =
  /Core opens Phase 4 Quality Gates Verification Repair/u;
const EVIDENCE_MISSING_EXPLANATION_RE =
  /Core did not find passed formal verification evidence/u;
const PREFERRED_EVIDENCE_PATH_RE = /verificationEvidence\.commands\[\]/u;
const NESTED_EVIDENCE_PATH_RE = /verificationEvidence\.commandRuns\[\]/u;
const SEQUENTIAL_EVIDENCE_MODE_RE =
  /verificationEvidence\.executionMode[\s\S]*"sequential"/u;
const SEQUENTIAL_DIAGNOSTIC_RE = /sequential workspace transaction/u;
const SEQUENCE_FIELD_RE = /"sequence": 1/u;
const QUALITY_GATES_JSON_PATH_RE = /quality_gates\/quality-gates\.json/u;
const BEFORE_COMMIT_COMMAND_RE = /"command": "npm run qg:before-commit"/u;
const PRE_COMMIT_HOOK_RE = /"command": "sh \.husky\/pre-commit"/u;
const VERIFIED_STATE_RE = /"verificationState": "verified"/u;
const STAGE_PLAN_PATH_RE =
  /Active stage todo-plan: `doc\/TODO\/stages\/quality-gates\/todo-plan\.md`/u;
const ZERO_CONTEXT_RE = /zero-context Core phase prompt/u;

test("Quality Gates continuation prompts carry phase envelopes", () => {
  const prompts = [
    {
      content: buildQualityGatesContractDraftPrompt({
        workspaceSlug: WORKSPACE_SLUG,
      }),
      phase: PHASE2_DRAFT_RE,
    },
    {
      content: buildQualityGatesIntegrationPrompt({
        workspaceSlug: WORKSPACE_SLUG,
      }),
      phase: PHASE3_INTEGRATION_RE,
    },
    {
      content: buildQualityGatesIntegrationRepairPrompt({
        attemptNumber: 1,
        diagnostics: ["missing_package_json"],
        workspaceSlug: WORKSPACE_SLUG,
      }),
      phase: PHASE3_REPAIR_RE,
    },
    {
      content: buildQualityGatesVerificationRepairPrompt({
        attemptNumber: 1,
        diagnostics: [
          "missing_verification_command_evidence:npm run qg:before-commit",
        ],
        workspaceSlug: WORKSPACE_SLUG,
      }),
      phase: PHASE4_REPAIR_RE,
    },
  ];
  for (const prompt of prompts) {
    assert.match(prompt.content, prompt.phase);
    assert.match(prompt.content, STAGE_PLAN_PATH_RE);
    assert.match(prompt.content, ZERO_CONTEXT_RE);
  }
});

test("Quality Gates verification repair prompt explains evidence shape", () => {
  const prompt = buildQualityGatesVerificationRepairPrompt({
    attemptNumber: 2,
    diagnostics: [
      "missing_verification_command_evidence:npm run qg:before-commit",
      "missing_verification_command_evidence:sh .husky/pre-commit",
      "missing_sequential_verification_evidence",
    ],
    workspaceSlug: WORKSPACE_SLUG,
  });

  assert.match(prompt, EVIDENCE_MISSING_EXPLANATION_RE);
  assert.match(prompt, PREFERRED_EVIDENCE_PATH_RE);
  assert.match(prompt, NESTED_EVIDENCE_PATH_RE);
  assert.match(prompt, SEQUENTIAL_EVIDENCE_MODE_RE);
  assert.match(prompt, SEQUENTIAL_DIAGNOSTIC_RE);
  assert.match(prompt, SEQUENCE_FIELD_RE);
  assert.match(prompt, QUALITY_GATES_JSON_PATH_RE);
  assert.match(prompt, BEFORE_COMMIT_COMMAND_RE);
  assert.match(prompt, PRE_COMMIT_HOOK_RE);
  assert.match(prompt, VERIFIED_STATE_RE);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQualityGatesContractDraftPrompt,
  buildQualityGatesIntegrationPrompt,
  buildQualityGatesIntegrationRepairPrompt,
} from "./quality-gates-prompt-builder";

const WORKSPACE_SLUG = "demo-workspace";
const PHASE2_DRAFT_RE = /Core opens Phase 2 Quality Gates Contract Draft/u;
const PHASE3_INTEGRATION_RE = /Core opens Phase 3 Quality Gates Integration/u;
const PHASE3_REPAIR_RE = /Core opens Phase 3 Quality Gates Integration Repair/u;
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
  ];
  for (const prompt of prompts) {
    assert.match(prompt.content, prompt.phase);
    assert.match(prompt.content, STAGE_PLAN_PATH_RE);
    assert.match(prompt.content, ZERO_CONTEXT_RE);
  }
});

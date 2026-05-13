import assert from "node:assert/strict";
import test from "node:test";
import { createQualityGatesActionLines } from "./quality-gates-feedback-action-lines";

const PHASE3_REPAIR_RE =
  /Continue the Phase 3 Quality Gates integration repair/u;
const SCRIPTS_QG_RE = /scripts\/qg\/\*\*/u;
const NO_CORE_HOOK_DEFER_RE = /do not defer required hooks to Core/u;
const DO_NOT_UPDATE_RE = /Do not update Quality Gates artifacts/u;
const WAIT_FOR_CORE_RE = /Wait for Core/u;

test("accepted Quality Gates integration repair remains provider-actionable", () => {
  const actionLines = createQualityGatesActionLines({
    outOfOwnerDirtyFiles: [],
    progress: {
      acceptanceCommitted: true,
      accepted: true,
      commandContractReady: true,
      integrated: false,
      integrationState: "integrated",
      jsonExists: true,
      markdownExists: true,
      substep: "failed",
      validationErrors: [
        "Quality gate secret-leak-prevention is missing from .husky/pre-commit",
      ],
    },
  });

  const text = actionLines.join("\n");
  assert.match(text, PHASE3_REPAIR_RE);
  assert.match(text, SCRIPTS_QG_RE);
  assert.match(text, NO_CORE_HOOK_DEFER_RE);
  assert.doesNotMatch(text, DO_NOT_UPDATE_RE);
  assert.doesNotMatch(text, WAIT_FOR_CORE_RE);
});

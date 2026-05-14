import assert from "node:assert/strict";
import test from "node:test";
import { createQualityGatesActionLines } from "./quality-gates-feedback-action-lines";

const SUSPENDED_INTEGRATION_RE = /Integration continuation is suspended/u;
const DO_NOT_UPDATE_RE = /Do not update Quality Gates artifacts/u;
const WAIT_FOR_CORE_RE = /Wait for Core/u;

test("accepted Quality Gates integration stays suspended during rewrite", () => {
  const actionLines = createQualityGatesActionLines({
    outOfOwnerDirtyFiles: [],
    progress: {
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
  assert.match(text, SUSPENDED_INTEGRATION_RE);
  assert.doesNotMatch(text, DO_NOT_UPDATE_RE);
  assert.doesNotMatch(text, WAIT_FOR_CORE_RE);
});

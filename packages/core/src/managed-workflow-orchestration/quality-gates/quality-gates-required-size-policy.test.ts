import assert from "node:assert/strict";
import test from "node:test";
import { buildQualityGatesIntegrationRepairPrompt } from "./quality-gates-prompt-builder";
import { collectRequiredSizePolicyDiagnostics } from "./quality-gates-required-size-policy";

const WORKSPACE_SLUG = "demo-workspace";
const SOURCE_SIZE_LIMIT_RE = /source_size_limit/u;
const MAX_LINES_RE = /"maxLines": 500/u;
const APPLIES_TO_RE = /"appliesTo": \["source_files", "classes"\]/u;
const REQUIRED_HOOK_SCOPE_RE = /requiredBeforeCommit` or `requiredBeforePush/u;

test("Quality Gates size policy accepts structured source size metadata", () => {
  const diagnostics = collectRequiredSizePolicyDiagnostics(
    {
      requiredBeforeCommit: ["size_policy"],
      requiredBeforePush: [],
    },
    {
      size_policy: {
        id: "size_policy",
        policy: {
          appliesTo: ["source_files", "classes"],
          maxLines: 500,
          type: "source_size_limit",
        },
        proposedCommand: "npm run qg:size_policy",
      },
    }
  );

  assert.deepEqual(diagnostics, []);
});

test("Quality Gates size policy repair prompt explains exact structured contract", () => {
  const prompt = buildQualityGatesIntegrationRepairPrompt({
    attemptNumber: 2,
    diagnostics: ["missing_required_size_policy_gate"],
    rejectedCommitHash: "abc1234",
    workspaceSlug: WORKSPACE_SLUG,
  });

  assert.match(prompt, SOURCE_SIZE_LIMIT_RE);
  assert.match(prompt, MAX_LINES_RE);
  assert.match(prompt, APPLIES_TO_RE);
  assert.match(prompt, REQUIRED_HOOK_SCOPE_RE);
});

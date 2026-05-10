import assert from "node:assert/strict";
import test from "node:test";
import { buildApplicationSkeletonRepairFeedbackMessage } from "./application-skeleton-contract-feedback";

const NO_OWNED_DIFF_RE = /turn ended without owned diff/;
const SKELETON_MD_RE = /application-skeleton\.md/;
const SKELETON_MAP_RE = /application-skeleton-map\.json/;
const BLOCKER_NOTE_RE = /blocker note/;
const NO_GIT_COMMAND_RE = /do not run Git, staging, or plan commands/iu;
const STRUCTURALLY_INVALID_RE = /Phase 1A draft as structurally invalid/;
const SKELETON_MD_MISSING_RE = /application-skeleton\.md is missing/;
const SCHEMA_MISMATCH_RE = /schema mismatch/;
const ENTRY_ONE_RE = /- entry-one/;
const ENTRY_TWO_RE = /- entry-two/;
const ENTRY_THREE_RE = /- entry-three/;

test("builder returns null for noop decision", () => {
  assert.equal(
    buildApplicationSkeletonRepairFeedbackMessage({
      kind: "noop",
      reason: "no_terminal_event",
    }),
    null
  );
  assert.equal(
    buildApplicationSkeletonRepairFeedbackMessage({
      kind: "noop",
      reason: "out_of_scope_phase",
    }),
    null
  );
});

test("builder returns null for commit_ready decision", () => {
  assert.equal(
    buildApplicationSkeletonRepairFeedbackMessage({
      kind: "commit_ready",
      reason: "draft_complete",
    }),
    null
  );
});

test("builder generates content-readiness wording for repair_no_progress", () => {
  const text = buildApplicationSkeletonRepairFeedbackMessage({
    kind: "repair_no_progress",
    reason: "terminal_no_owned_diff_in_phase_1a",
  });
  assert.ok(text);
  assert.match(text ?? "", NO_OWNED_DIFF_RE);
  assert.match(text ?? "", SKELETON_MD_RE);
  assert.match(text ?? "", SKELETON_MAP_RE);
  assert.match(text ?? "", BLOCKER_NOTE_RE);
  assert.match(text ?? "", NO_GIT_COMMAND_RE);
});

test("builder surfaces invalid-draft details and forbids provider git/staging operations", () => {
  const text = buildApplicationSkeletonRepairFeedbackMessage({
    kind: "repair_invalid_draft",
    reason: "implicit_readiness_with_invalid_draft",
    details: [
      "application-skeleton.md is missing",
      "application-skeleton-map.json schema mismatch",
    ],
  });
  assert.ok(text);
  assert.match(text ?? "", STRUCTURALLY_INVALID_RE);
  assert.match(text ?? "", SKELETON_MD_MISSING_RE);
  assert.match(text ?? "", SCHEMA_MISMATCH_RE);
  assert.match(text ?? "", NO_GIT_COMMAND_RE);
});

test("builder lists every detail entry verbatim with bullet prefix", () => {
  const text =
    buildApplicationSkeletonRepairFeedbackMessage({
      kind: "repair_invalid_draft",
      reason: "implicit_readiness_with_invalid_draft",
      details: ["entry-one", "entry-two", "entry-three"],
    }) ?? "";
  assert.match(text, ENTRY_ONE_RE);
  assert.match(text, ENTRY_TWO_RE);
  assert.match(text, ENTRY_THREE_RE);
});

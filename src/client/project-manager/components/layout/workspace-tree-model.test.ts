import assert from "node:assert/strict";
import test from "node:test";
import { resolveTreeStatus } from "./workspace-tree-model";

test("resolveTreeStatus keeps started stages in progress until Core marks completed", () => {
  assert.equal(resolveTreeStatus("in_progress", false), "progress");
  assert.equal(resolveTreeStatus("completed", false), "active");
  assert.equal(resolveTreeStatus("idle", false), "todo");
});

test("resolveTreeStatus keeps completed markers active despite gating blockers", () => {
  assert.equal(resolveTreeStatus("completed", true), "active");
});

test("resolveTreeStatus preserves warning states for non-completed stages", () => {
  assert.equal(resolveTreeStatus("invalid", false), "blocked");
  assert.equal(resolveTreeStatus("outdated", false), "outdated");
});

test("resolveTreeStatus shows a running stage as progress even if stale gating is blocked", () => {
  assert.equal(resolveTreeStatus("in_progress", true), "progress");
});

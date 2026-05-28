import assert from "node:assert/strict";
import test from "node:test";
import { resolveTreeStatus } from "./workspace-tree-model";

test("resolveTreeStatus keeps started stages in progress until Core marks completed", () => {
  assert.equal(resolveTreeStatus("in_progress", false), "progress");
  assert.equal(resolveTreeStatus("completed", false), "active");
  assert.equal(resolveTreeStatus("idle", false), "todo");
});

test("resolveTreeStatus preserves warning states before completion visuals", () => {
  assert.equal(resolveTreeStatus("completed", true), "blocked");
  assert.equal(resolveTreeStatus("invalid", false), "blocked");
  assert.equal(resolveTreeStatus("outdated", false), "outdated");
});

test("resolveTreeStatus currently lets stale blocked gating override an active running stage", () => {
  assert.equal(resolveTreeStatus("in_progress", true), "blocked");
});

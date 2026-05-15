import assert from "node:assert/strict";
import test from "node:test";
import { resolveTreeStatus } from "./workspace-tree-model";

test("resolveTreeStatus keeps in-progress stages orange even when an artifact exists", () => {
  assert.equal(resolveTreeStatus("in_progress", false, true), "progress");
});

test("resolveTreeStatus marks completed artifact stages active", () => {
  assert.equal(resolveTreeStatus("completed", false, true), "active");
});


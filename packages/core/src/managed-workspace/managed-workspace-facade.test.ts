import assert from "node:assert/strict";
import test from "node:test";
import { ManagedWorkspaceFacade } from "./managed-workspace-facade";

const WORKSPACE_ROOT_REQUIRED_RE = /workspaceRoot is required/;

test("ManagedWorkspaceFacade rejects empty workspace roots", () => {
  const result = new ManagedWorkspaceFacade().resolvePaths({
    workspaceRoot: "  ",
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.equal(result.error, "workspaceRoot is required");
});

test("ManagedWorkspaceFacade resolves managed workspace paths", () => {
  const result = new ManagedWorkspaceFacade().resolvePaths({
    workspaceRoot: "/tmp/workspace",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(
    result.value.controlPlaneRoot.relativePath,
    ".codeai-hub/workflow"
  );
  assert.equal(result.value.todoPlan.relativePath, "doc/TODO/todo-plan.md");
});

test("ManagedWorkspaceFacade resolvePathsOrThrow throws validation errors", () => {
  assert.throws(
    () =>
      new ManagedWorkspaceFacade().resolvePathsOrThrow({ workspaceRoot: "" }),
    WORKSPACE_ROOT_REQUIRED_RE
  );
});

test("ManagedWorkspaceFacade creates semantic drift reports", () => {
  const report = new ManagedWorkspaceFacade().createSemanticDriftReport([
    {
      affectedPaths: [".codeai-hub/demo/quality_gates/quality-gates.json"],
      code: "quality_gates_outdated",
      detail: "Quality Gates must be reviewed after skeleton changes.",
      recommendedOwner: "agent",
    },
  ]);

  assert.equal(report.ok, false);
  assert.equal(report.issues[0]?.repairMode, "decision_required");
});

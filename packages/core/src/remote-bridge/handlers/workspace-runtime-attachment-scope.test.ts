import assert from "node:assert/strict";
import test from "node:test";
import { isWorkspaceRuntimeRootObservable } from "./workspace-runtime-attachment-scope";

test("workspace runtime attachment scope includes main workspace and its worktrees", () => {
  const mainWorkspaceRoot = "/tmp/FinderWidget-Test01";

  assert.equal(
    isWorkspaceRuntimeRootObservable({
      candidateWorkspaceRoot: mainWorkspaceRoot,
      mainWorkspaceRoot,
    }),
    true
  );
  assert.equal(
    isWorkspaceRuntimeRootObservable({
      candidateWorkspaceRoot:
        "/tmp/FinderWidget-Test01.worktrees/finderwidget-test01/product-parts/finder-widget/cluster-contracts/note-selection-cluster",
      mainWorkspaceRoot,
    }),
    true
  );
  assert.equal(
    isWorkspaceRuntimeRootObservable({
      candidateWorkspaceRoot: "/tmp/FinderWidget-Test01.worktrees",
      mainWorkspaceRoot,
    }),
    true
  );
});

test("workspace runtime attachment scope rejects unrelated or prefix-only roots", () => {
  const mainWorkspaceRoot = "/tmp/FinderWidget-Test01";

  assert.equal(
    isWorkspaceRuntimeRootObservable({
      candidateWorkspaceRoot: "/tmp/FinderWidget-Test01.worktrees2/demo",
      mainWorkspaceRoot,
    }),
    false
  );
  assert.equal(
    isWorkspaceRuntimeRootObservable({
      candidateWorkspaceRoot: "/tmp/OtherProject.worktrees/demo",
      mainWorkspaceRoot,
    }),
    false
  );
});

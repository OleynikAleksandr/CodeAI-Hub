import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ManagedPlanOrchestratorInstaller } from "./managed-plan-orchestrator-installer";
import { ManagedWorkspaceBootstrapper } from "./managed-workspace-bootstrapper";
import { ManagedWorkspaceValidator } from "./managed-workspace-validator";

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "managed-validator-"));

test("ManagedWorkspaceValidator reports missing baseline pieces", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    const result = await new ManagedWorkspaceValidator().validate(
      workspaceRoot
    );

    assert.equal(result.ok, false);
    assert.equal(
      result.issues.some((issue) => issue.code === "missing_git_repo"),
      true
    );
    assert.equal(
      result.issues.some(
        (issue) => issue.relativePath === "doc/TODO/todo-plan.md"
      ),
      true
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("ManagedWorkspaceValidator accepts bootstrapped lifecycle baseline", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    await new ManagedWorkspaceBootstrapper({
      commandRunner: () => mkdir(path.join(workspaceRoot, ".git")),
      createdAt: "2026-05-07T00:00:00.000Z",
    }).bootstrap(workspaceRoot);
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot);
    await writeFile(
      path.join(workspaceRoot, "doc/TODO/todo-plan.md"),
      "placeholder\n",
      "utf8"
    );

    const result = await new ManagedWorkspaceValidator().validate(
      workspaceRoot
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.issues, []);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

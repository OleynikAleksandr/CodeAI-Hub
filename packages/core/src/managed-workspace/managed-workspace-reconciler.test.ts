import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ManagedWorkspaceBootstrapper } from "./managed-workspace-bootstrapper";
import { ManagedWorkspaceReconciler } from "./managed-workspace-reconciler";

const PLAN_STATUS_SCRIPT_RE = /"plan:status"/u;
const PRE_COMMIT_VALIDATE_RE = /plan-cli\.mjs validate/u;

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "managed-workspace-reconciler-"));

test("ManagedWorkspaceReconciler restores deterministic lifecycle baseline", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  const commandRunner = async () => {
    await mkdir(path.join(workspaceRoot, ".git"), { recursive: true });
  };

  try {
    await writeFile(
      path.join(workspaceRoot, "package.json"),
      `${JSON.stringify({ private: true, scripts: {} }, null, 2)}\n`,
      "utf8"
    );

    const result = await new ManagedWorkspaceReconciler({
      bootstrapper: new ManagedWorkspaceBootstrapper({
        commandRunner,
        createdAt: "2026-05-07T00:00:00.000Z",
      }),
    }).reconcile(workspaceRoot);

    assert.equal(result.before.ok, false);
    assert.equal(result.ok, true);
    assert.equal(result.after.issues.length, 0);
    assert.equal(result.installer.hooksWritten.includes("pre-commit"), true);

    const packageJson = await readFile(
      path.join(workspaceRoot, "package.json"),
      "utf8"
    );
    const preCommit = await readFile(
      path.join(workspaceRoot, ".husky/pre-commit"),
      "utf8"
    );
    assert.match(packageJson, PLAN_STATUS_SCRIPT_RE);
    assert.match(preCommit, PRE_COMMIT_VALIDATE_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedPlanOrchestratorInstaller } from "../../managed-workspace/managed-plan-orchestrator-installer";
import { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";

const execFileAsync = promisify(execFile);

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const initManagedWorkspace = async (
  workspaceRoot: string,
  initialStage: "diagram_modules" | "application_skeleton" | "quality_gates"
): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
  await runGit(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
  await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
    initialStage,
  });
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, [
    "-c",
    "core.hooksPath=",
    "commit",
    "-m",
    "test: managed baseline",
  ]);
};

test("managed documentation commit transaction commits only active stage files", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-documentation-commit-")
  );

  try {
    await initManagedWorkspace(workspaceRoot, "diagram_modules");
    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/demo/diagram_modules/product-parts.index.md",
      "# Product Parts\n"
    );

    const result =
      await new ManagedDocumentationCommitTransaction().commitAcceptedStage({
        workspaceRoot,
        workspaceSlug: "demo",
      });

    assert.equal(result.status, "committed");
    assert.deepEqual(result.ownedFiles, [
      ".codeai-hub/demo/diagram_modules/product-parts.index.md",
    ]);
    assert.equal(result.unmanagedDirtyFiles.length, 0);
    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
    assert.equal(
      await runGit(workspaceRoot, ["log", "-1", "--pretty=%s"]),
      "chore: record managed workspace ledger"
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed documentation commit transaction commits Quality Gates draft files for the active draft task", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-documentation-commit-quality-gates-")
  );

  try {
    await initManagedWorkspace(workspaceRoot, "quality_gates");
    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/demo/quality_gates/quality-gates.md",
      "# Quality Gates\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/demo/quality_gates/quality-gates.json",
      `${JSON.stringify(
        {
          accepted: false,
          commands: { "qg-smoke": { id: "qg-smoke" } },
          integrated: false,
          integrationState: "draft",
          schema: "codeai-quality-gates-v1",
        },
        null,
        2
      )}\n`
    );

    const result =
      await new ManagedDocumentationCommitTransaction().commitAcceptedStage({
        workspaceRoot,
        workspaceSlug: "demo",
      });

    assert.equal(result.status, "committed");
    assert.equal(result.unmanagedDirtyFiles.length, 0);
    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
    assert.equal(
      await runGit(workspaceRoot, ["log", "-1", "--pretty=%s"]),
      "chore: record managed workspace ledger"
    );
    const previousCommit = await runGit(workspaceRoot, [
      "log",
      "-2",
      "--pretty=%s",
    ]);
    assert.equal(
      previousCommit.includes("docs: draft quality gates contract"),
      true
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed documentation commit transaction blocks files outside active stage", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-documentation-commit-blocked-")
  );

  try {
    await initManagedWorkspace(workspaceRoot, "diagram_modules");
    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/demo/diagram_modules/product-parts.index.md",
      "# Product Parts\n"
    );
    await writeWorkspaceFile(workspaceRoot, "scratch/unmanaged.txt", "dirty\n");

    const result =
      await new ManagedDocumentationCommitTransaction().commitAcceptedStage({
        workspaceRoot,
        workspaceSlug: "demo",
      });

    assert.equal(result.status, "blocked");
    assert.deepEqual(result.unmanagedDirtyFiles, ["scratch/unmanaged.txt"]);
    assert.equal(
      await runGit(workspaceRoot, ["diff", "--cached", "--name-only"]),
      ""
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { WorkflowBoundaryFacade } from "./workflow-boundary-facade";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";

const execFileAsync = promisify(execFile);
const VIRTUAL_BOUNDARY_REGISTRY_RE =
  /codeai-boundary-registry: Virtual Simulation/u;

const createWorkspace = async (): Promise<string> =>
  await mkdtemp(path.join(tmpdir(), "codeai-boundary-git-"));

const writeText = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, { cwd: workspaceRoot });
  return stdout.trim();
};

test("WorkflowBoundaryGit stages deep explicit managed plan paths", async () => {
  const workspaceRoot = await createWorkspace();
  const planPath =
    "doc/TODO/stages/development-tree/product-parts/finder-widget/clusters/note-selection-cluster/todo-plan.md";
  try {
    await writeText(workspaceRoot, planPath, "# Cluster plan\n");

    const result = await new WorkflowBoundaryGit().commit({
      commitMessage: "chore: advance managed workflow ledger",
      paths: [planPath],
      workspaceRoot,
    });

    assert.equal(result.noStagedChanges, false);
    assert.equal(
      await git(workspaceRoot, ["ls-files", "--", planPath]),
      planPath
    );
    assert.deepEqual(
      await new WorkflowBoundaryGit().statusPorcelain(workspaceRoot),
      []
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("WorkflowBoundaryGit skips explicit ignored runtime path specs", async () => {
  const workspaceRoot = await createWorkspace();
  const continuityPath = ".codeai-hub/demo/continuity/index.json";
  const runtimePath = ".codeai-hub/demo/runtime/sessions/session.jsonl";
  try {
    await writeText(workspaceRoot, ".gitignore", ".codeai-hub/*/runtime/\n");
    await writeText(workspaceRoot, continuityPath, "{}\n");
    await writeText(workspaceRoot, runtimePath, '{"event":"local"}\n');

    const result = await new WorkflowBoundaryGit().commit({
      commitMessage: "docs: bootstrap product part development briefs",
      paths: [".gitignore", continuityPath, runtimePath],
      workspaceRoot,
    });

    assert.equal(result.noStagedChanges, false);
    assert.equal(
      await git(workspaceRoot, ["ls-files", "--", continuityPath]),
      continuityPath
    );
    assert.equal(await git(workspaceRoot, ["ls-files", "--", runtimePath]), "");
    assert.deepEqual(
      await new WorkflowBoundaryGit().statusPorcelain(workspaceRoot),
      []
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("WorkflowBoundaryGit preserves dot-prefixed modified paths for boundary preflight", async () => {
  const workspaceRoot = await createWorkspace();
  const workspaceSlug = "finderwidget-test01";
  const workflowStatePath = `.codeai-hub/${workspaceSlug}/workflow/state.json`;
  try {
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
    await writeText(workspaceRoot, workflowStatePath, '{"old":true}\n');
    await git(workspaceRoot, ["add", workflowStatePath]);
    await git(workspaceRoot, ["commit", "-m", "codeai-boundary: Description"]);
    await writeText(workspaceRoot, workflowStatePath, '{"new":true}\n');
    await writeText(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
      "# Final Description\n"
    );

    const status = await new WorkflowBoundaryGit().statusPorcelain(
      workspaceRoot
    );
    assert.equal(status[0], ` M ${workflowStatePath}`);

    const boundary = await new WorkflowBoundaryFacade().ensureBoundary({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(boundary.created, true);
    assert.match(
      await git(workspaceRoot, ["log", "--oneline", "-1"]),
      VIRTUAL_BOUNDARY_REGISTRY_RE
    );
    assert.deepEqual(
      await new WorkflowBoundaryGit().statusPorcelain(workspaceRoot),
      []
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { WorkflowGitRollbackFacade } from "./workflow-git-rollback-facade";

const WORKSPACE_SLUG = "demo-workspace";
const GIT_HASH_RE = /^[0-9a-f]{7,40}$/iu;

const git = (workspaceRoot: string, args: readonly string[]): string =>
  execFileSync("git", args, {
    cwd: workspaceRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

const exists = async (targetPath: string): Promise<boolean> =>
  Boolean(await stat(targetPath).catch(() => null));

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content = "test\n"
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const commitAll = (workspaceRoot: string, message: string): string => {
  git(workspaceRoot, ["add", "-A", "--", "."]);
  git(workspaceRoot, ["commit", "-m", message]);
  return git(workspaceRoot, ["rev-parse", "--short", "HEAD"]);
};

const createRepository = async (): Promise<string> => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-git-rollback-")
  );
  git(workspaceRoot, ["init", "-b", "main"]);
  git(workspaceRoot, ["config", "user.email", "test@example.local"]);
  git(workspaceRoot, ["config", "user.name", "Test User"]);
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
  commitAll(workspaceRoot, "chore: initial workspace");
  return workspaceRoot;
};

const createManagedRepositoryWithoutUserCommit = async (): Promise<string> => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-git-rollback-managed-root-")
  );
  git(workspaceRoot, ["init", "-b", "main"]);
  git(workspaceRoot, ["config", "user.email", "test@example.local"]);
  git(workspaceRoot, ["config", "user.name", "Test User"]);
  return workspaceRoot;
};

test("Git rollback restores Quality Gates to the pre-stage boundary and keeps Application Skeleton", async () => {
  const workspaceRoot = await createRepository();
  try {
    const appMapPath = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`;
    const qualityReportPath = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.md`;
    await writeWorkspaceFile(workspaceRoot, appMapPath, '{"accepted":true}\n');
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`
    );
    commitAll(workspaceRoot, "feat: materialize application skeleton");
    await writeWorkspaceFile(workspaceRoot, qualityReportPath);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/quality_gates.json`,
      '{"valid":true}\n'
    );
    commitAll(workspaceRoot, "docs: draft quality gates contract");
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`
    );
    commitAll(workspaceRoot, "docs: repair quality gates draft attempt 1");
    await rm(path.join(workspaceRoot, qualityReportPath), { force: true });
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`,
      '{"stale":true}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/untracked.tmp`
    );

    const result = await new WorkflowGitRollbackFacade().rollbackStage({
      stage: "quality_gates",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.handled, true);
    assert.equal(result.reason, null);
    assert.match(result.rollbackCommit ?? "", GIT_HASH_RE);
    assert.equal(await exists(path.join(workspaceRoot, appMapPath)), true);
    assert.equal(
      await exists(path.join(workspaceRoot, qualityReportPath)),
      false
    );
    assert.equal(
      await exists(
        path.join(
          workspaceRoot,
          `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/quality_gates.json`
        )
      ),
      false
    );
    assert.equal(git(workspaceRoot, ["status", "--short"]), "");
    assert.equal(
      git(workspaceRoot, ["log", "-1", "--pretty=%s"]),
      "chore: clear workflow stage quality_gates"
    );
    assert.equal(
      await readFile(path.join(workspaceRoot, appMapPath), "utf8"),
      '{"accepted":true}\n'
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Git rollback finds Diagram Modules boundary from materialized development tree", async () => {
  const workspaceRoot = await createRepository();
  try {
    const virtualSimulationPath = `.codeai-hub/${WORKSPACE_SLUG}/virtual_simulation/final-virtual-simulation.md`;
    const devTreePath = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/core/index.md`;
    const continuityPath = `.codeai-hub/${WORKSPACE_SLUG}/continuity/development_tree/index.json`;
    const todoTreePath =
      "doc/TODO/stages/development-tree/product-parts/core/todo-plan.md";
    await writeWorkspaceFile(workspaceRoot, virtualSimulationPath);
    commitAll(workspaceRoot, "docs: accept virtual simulation");
    await writeWorkspaceFile(workspaceRoot, devTreePath);
    await writeWorkspaceFile(workspaceRoot, continuityPath, '{"valid":true}\n');
    await writeWorkspaceFile(workspaceRoot, todoTreePath);
    commitAll(workspaceRoot, "feat: materialize diagram modules tree");
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/development_tree/untracked.tmp`
    );

    const result = await new WorkflowGitRollbackFacade().rollbackStage({
      stage: "diagram_modules",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.handled, true);
    assert.equal(result.reason, null);
    assert.match(result.rollbackCommit ?? "", GIT_HASH_RE);
    assert.equal(
      await exists(path.join(workspaceRoot, virtualSimulationPath)),
      true
    );
    assert.equal(await exists(path.join(workspaceRoot, devTreePath)), false);
    assert.equal(await exists(path.join(workspaceRoot, continuityPath)), false);
    assert.equal(await exists(path.join(workspaceRoot, todoTreePath)), false);
    assert.equal(
      await exists(
        path.join(
          workspaceRoot,
          `.codeai-hub/${WORKSPACE_SLUG}/development_tree/untracked.tmp`
        )
      ),
      false
    );
    assert.equal(git(workspaceRoot, ["status", "--short"]), "");
    assert.equal(
      git(workspaceRoot, ["log", "-1", "--pretty=%s"]),
      "chore: clear workflow stage diagram_modules"
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Git rollback clears Core-created Diagram Modules scaffold back to Virtual Simulation state", async () => {
  const workspaceRoot = await createManagedRepositoryWithoutUserCommit();
  try {
    const descriptionPath = `.codeai-hub/${WORKSPACE_SLUG}/description/Final_Description.md`;
    const virtualSimulationPath = `.codeai-hub/${WORKSPACE_SLUG}/virtual_simulation/virtual-simulation.md`;
    const diagramPath = `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`;
    const appPath = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`;

    await writeWorkspaceFile(workspaceRoot, descriptionPath);
    await writeWorkspaceFile(workspaceRoot, virtualSimulationPath);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`,
      '{"lastActive":{"stage":"virtual_simulation"}}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );
    await writeWorkspaceFile(workspaceRoot, ".husky/pre-commit");
    await writeWorkspaceFile(workspaceRoot, "package.json", "{}\n");
    await writeWorkspaceFile(workspaceRoot, ".gitignore");
    commitAll(workspaceRoot, "docs: checkpoint managed workflow inputs");

    await writeWorkspaceFile(workspaceRoot, diagramPath);
    await writeWorkspaceFile(workspaceRoot, appPath);
    await writeWorkspaceFile(
      workspaceRoot,
      "product-parts/core-runtime/src/index.ts"
    );
    await writeWorkspaceFile(workspaceRoot, "package-lock.json", "{}\n");
    await writeWorkspaceFile(workspaceRoot, "node_modules/typescript/index.js");
    commitAll(workspaceRoot, "docs: update diagram modules product part index");

    const result = await new WorkflowGitRollbackFacade().rollbackStage({
      stage: "diagram_modules",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.handled, true);
    assert.equal(result.reason, null);
    assert.equal(result.removedGitMetadata, true);
    assert.match(result.rollbackCommit ?? "", GIT_HASH_RE);
    assert.equal(await exists(path.join(workspaceRoot, ".git")), false);
    assert.equal(await exists(path.join(workspaceRoot, descriptionPath)), true);
    assert.equal(
      await exists(path.join(workspaceRoot, virtualSimulationPath)),
      true
    );
    assert.equal(await exists(path.join(workspaceRoot, diagramPath)), false);
    assert.equal(await exists(path.join(workspaceRoot, appPath)), false);
    assert.equal(await exists(path.join(workspaceRoot, ".husky")), false);
    assert.equal(await exists(path.join(workspaceRoot, "doc")), false);
    assert.equal(await exists(path.join(workspaceRoot, "scripts")), false);
    assert.equal(await exists(path.join(workspaceRoot, "package.json")), false);
    assert.equal(
      await exists(path.join(workspaceRoot, "package-lock.json")),
      false
    );
    assert.equal(
      await exists(path.join(workspaceRoot, "product-parts")),
      false
    );
    assert.equal(await exists(path.join(workspaceRoot, "node_modules")), false);
    assert.equal(
      await readFile(
        path.join(
          workspaceRoot,
          `.codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`
        ),
        "utf8"
      ),
      '{"lastActive":{"stage":"virtual_simulation"}}\n'
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Git rollback ignores managed scaffold plans when finding the Application Skeleton boundary", async () => {
  const workspaceRoot = await createRepository();
  try {
    const diagramArtifactPath = `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`;
    const appArtifactPath = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`;
    const appManagedPath = `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/application_skeleton.json`;
    await writeWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md",
      "# Application Skeleton Plan\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md",
      "# Diagram Modules Plan\n"
    );
    await writeWorkspaceFile(workspaceRoot, diagramArtifactPath);
    commitAll(workspaceRoot, "docs: checkpoint managed workflow inputs");
    await writeWorkspaceFile(workspaceRoot, appArtifactPath);
    await writeWorkspaceFile(workspaceRoot, appManagedPath, '{"valid":true}\n');
    commitAll(workspaceRoot, "docs: draft application skeleton contract");
    await writeWorkspaceFile(
      workspaceRoot,
      "product-parts/core-runtime/src/index.ts"
    );
    commitAll(
      workspaceRoot,
      "feat: materialize application skeleton attempt 1"
    );

    const result = await new WorkflowGitRollbackFacade().rollbackStage({
      stage: "application_skeleton",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.handled, true);
    assert.equal(result.reason, null);
    assert.match(result.rollbackCommit ?? "", GIT_HASH_RE);
    assert.equal(
      await exists(path.join(workspaceRoot, diagramArtifactPath)),
      true
    );
    assert.equal(
      await exists(path.join(workspaceRoot, appArtifactPath)),
      false
    );
    assert.equal(
      await exists(path.join(workspaceRoot, "product-parts")),
      false
    );
    assert.equal(
      await exists(
        path.join(
          workspaceRoot,
          "doc/TODO/stages/application-skeleton/todo-plan.md"
        )
      ),
      true
    );
    assert.equal(git(workspaceRoot, ["status", "--short"]), "");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Git rollback reports non-managed stages without touching the repository", async () => {
  const workspaceRoot = await createRepository();
  try {
    const result = await new WorkflowGitRollbackFacade().rollbackStage({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.handled, false);
    assert.equal(result.reason, "stage_not_git_managed");
    assert.equal(git(workspaceRoot, ["status", "--short"]), "");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

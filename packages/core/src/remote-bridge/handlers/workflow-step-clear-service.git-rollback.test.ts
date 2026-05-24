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
import type { Request, Response } from "express";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { handleWorkflowStepClear } from "./workflow-step-clear-service";

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

const commitAll = (workspaceRoot: string, message: string): void => {
  git(workspaceRoot, ["add", "-A", "--", "."]);
  git(workspaceRoot, ["commit", "-m", message]);
};

const createRepository = async (): Promise<string> => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-clear-git-")
  );
  git(workspaceRoot, ["init", "-b", "main"]);
  git(workspaceRoot, ["config", "user.email", "test@example.local"]);
  git(workspaceRoot, ["config", "user.name", "Test User"]);
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
  commitAll(workspaceRoot, "chore: initial workspace");
  return workspaceRoot;
};

const runClear = async (params: {
  readonly body: unknown;
  readonly resetCalls: string[];
  readonly sessionManager: SessionManager;
}): Promise<{ readonly payload: unknown; readonly statusCode: number }> => {
  let statusCode = 200;
  let payload: unknown = null;
  const response = {
    json(nextPayload: unknown) {
      payload = nextPayload;
      return this;
    },
    status(nextStatusCode: number) {
      statusCode = nextStatusCode;
      return this;
    },
  } as unknown as Response;
  await handleWorkflowStepClear({ body: params.body } as Request, response, {
    logger: new Logger("error"),
    resetWorkflowState: (workspaceSlug) =>
      params.resetCalls.push(workspaceSlug),
    sessionManager: params.sessionManager,
  });
  return { payload, statusCode };
};

test("workflow step clear uses Git rollback for Quality Gates tracked workspace state", async () => {
  const workspaceRoot = await createRepository();
  const resetCalls: string[] = [];
  try {
    const appMapPath = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`;
    const qualityRoot = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates`;
    await writeWorkspaceFile(workspaceRoot, appMapPath, '{"accepted":true}\n');
    commitAll(workspaceRoot, "feat: materialize application skeleton");
    await writeWorkspaceFile(
      workspaceRoot,
      `${qualityRoot}/quality-gates-research.md`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/quality_gates.json`,
      '{"valid":true}\n'
    );
    commitAll(workspaceRoot, "docs: draft quality gates contract");
    await rm(
      path.join(workspaceRoot, `${qualityRoot}/quality-gates-research.md`),
      {
        force: true,
      }
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`,
      '{"dirty":true}\n'
    );

    const result = await runClear({
      body: {
        workspacePath: workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
        target: { kind: "workflow_stage", stage: "quality_gates" },
      },
      resetCalls,
      sessionManager: new SessionManager(),
    });
    const payload = result.payload as {
      readonly gitRollback?: { readonly rollbackCommit?: string | null };
    };

    assert.equal(result.statusCode, 200);
    assert.match(payload.gitRollback?.rollbackCommit ?? "", GIT_HASH_RE);
    assert.equal(await exists(path.join(workspaceRoot, appMapPath)), true);
    assert.equal(await exists(path.join(workspaceRoot, qualityRoot)), false);
    assert.equal(git(workspaceRoot, ["status", "--short"]), "");
    assert.deepEqual(resetCalls, [WORKSPACE_SLUG]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow step clear uses Git rollback for Diagram Modules development tree state", async () => {
  const workspaceRoot = await createRepository();
  const resetCalls: string[] = [];
  try {
    const virtualSimulationPath = `.codeai-hub/${WORKSPACE_SLUG}/virtual_simulation/final-virtual-simulation.md`;
    const devTreeRoot = `.codeai-hub/${WORKSPACE_SLUG}/development_tree`;
    const devTreePath = `${devTreeRoot}/materialized/product-parts/core/index.md`;
    const continuityPath = `.codeai-hub/${WORKSPACE_SLUG}/continuity/development_tree/index.json`;
    const todoTreePath =
      "doc/TODO/stages/development-tree/product-parts/core/todo-plan.md";
    await writeWorkspaceFile(workspaceRoot, virtualSimulationPath);
    commitAll(workspaceRoot, "docs: accept virtual simulation");
    await writeWorkspaceFile(workspaceRoot, devTreePath);
    await writeWorkspaceFile(workspaceRoot, continuityPath, '{"valid":true}\n');
    await writeWorkspaceFile(workspaceRoot, todoTreePath);
    commitAll(workspaceRoot, "feat: materialize diagram modules tree");
    await writeWorkspaceFile(workspaceRoot, `${devTreeRoot}/untracked.tmp`);

    const result = await runClear({
      body: {
        workspacePath: workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
        target: { kind: "workflow_stage", stage: "diagram_modules" },
      },
      resetCalls,
      sessionManager: new SessionManager(),
    });
    const payload = result.payload as {
      readonly gitRollback?: { readonly rollbackCommit?: string | null };
    };

    assert.equal(result.statusCode, 200);
    assert.match(payload.gitRollback?.rollbackCommit ?? "", GIT_HASH_RE);
    assert.equal(
      await exists(path.join(workspaceRoot, virtualSimulationPath)),
      true
    );
    assert.equal(await exists(path.join(workspaceRoot, devTreeRoot)), false);
    assert.equal(await exists(path.join(workspaceRoot, continuityPath)), false);
    assert.equal(await exists(path.join(workspaceRoot, todoTreePath)), false);
    assert.equal(git(workspaceRoot, ["status", "--short"]), "");
    assert.deepEqual(resetCalls, [WORKSPACE_SLUG]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow step clear falls back when Git is already at the requested stage boundary", async () => {
  const workspaceRoot = await createRepository();
  const resetCalls: string[] = [];
  try {
    const virtualSimulationPath = `.codeai-hub/${WORKSPACE_SLUG}/virtual_simulation/final-virtual-simulation.md`;
    const devTreeRoot = `.codeai-hub/${WORKSPACE_SLUG}/development_tree`;
    const devTreePath = `${devTreeRoot}/materialized/product-parts/core/index.md`;
    const workflowStatePath = `.codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`;
    const undoLedgerPath = `.codeai-hub/${WORKSPACE_SLUG}/workflow/undo-ledger.json`;
    await writeWorkspaceFile(workspaceRoot, virtualSimulationPath);
    commitAll(workspaceRoot, "docs: accept virtual simulation");
    await writeWorkspaceFile(workspaceRoot, devTreePath);
    commitAll(workspaceRoot, "feat: materialize diagram modules tree");
    await rm(path.join(workspaceRoot, devTreeRoot), {
      force: true,
      recursive: true,
    });
    commitAll(workspaceRoot, "chore: previously clear diagram modules");
    await writeWorkspaceFile(
      workspaceRoot,
      workflowStatePath,
      '{"dirty":true}\n'
    );
    await writeWorkspaceFile(workspaceRoot, undoLedgerPath, '{"entries":[]}\n');

    const result = await runClear({
      body: {
        workspacePath: workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
        target: { kind: "workflow_stage", stage: "diagram_modules" },
      },
      resetCalls,
      sessionManager: new SessionManager(),
    });
    const payload = result.payload as {
      readonly gitRollback?: { readonly reason?: string | null };
    };

    assert.equal(result.statusCode, 200);
    assert.equal(payload.gitRollback?.reason, "already_at_boundary");
    assert.equal(
      await exists(path.join(workspaceRoot, virtualSimulationPath)),
      true
    );
    assert.equal(
      await exists(path.join(workspaceRoot, workflowStatePath)),
      false
    );
    assert.equal(await exists(path.join(workspaceRoot, undoLedgerPath)), false);
    assert.equal(git(workspaceRoot, ["status", "--short"]), "");
    assert.deepEqual(resetCalls, [WORKSPACE_SLUG]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow step clear falls back to path cleanup when Git is missing", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-clear-no-git-")
  );
  const resetCalls: string[] = [];
  try {
    const qualityArtifact = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`;
    await writeWorkspaceFile(workspaceRoot, qualityArtifact);

    const result = await runClear({
      body: {
        workspacePath: workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
        target: { kind: "workflow_stage", stage: "quality_gates" },
      },
      resetCalls,
      sessionManager: new SessionManager(),
    });
    const payload = result.payload as {
      readonly gitRollback?: { readonly reason?: string | null };
    };

    assert.equal(result.statusCode, 200);
    assert.equal(payload.gitRollback?.reason, "git_repository_missing");
    assert.equal(
      await exists(path.join(workspaceRoot, qualityArtifact)),
      false
    );
    assert.deepEqual(resetCalls, [WORKSPACE_SLUG]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow step clear rewinds stale last active after Diagram Modules clear without Git metadata", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-clear-last-active-")
  );
  const resetCalls: string[] = [];
  try {
    const virtualArtifact = `.codeai-hub/${WORKSPACE_SLUG}/virtual_simulation/virtual-simulation.md`;
    const diagramArtifact = `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`;
    const workflowStatePath = `.codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`;
    await writeWorkspaceFile(workspaceRoot, virtualArtifact);
    await writeWorkspaceFile(workspaceRoot, diagramArtifact);
    await writeWorkspaceFile(
      workspaceRoot,
      workflowStatePath,
      JSON.stringify(
        {
          workspaceSlug: WORKSPACE_SLUG,
          updatedAt: "2026-05-24T19:16:10.258Z",
          lastActive: {
            stage: "diagram_modules",
            updatedAt: "2026-05-24T19:16:10.258Z",
            artifactPath: diagramArtifact,
          },
        },
        null,
        2
      )
    );

    const result = await runClear({
      body: {
        workspacePath: workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
        target: { kind: "workflow_stage", stage: "diagram_modules" },
      },
      resetCalls,
      sessionManager: new SessionManager(),
    });
    const payload = result.payload as { readonly lastActiveReset?: boolean };
    const workflowState = JSON.parse(
      await readFile(path.join(workspaceRoot, workflowStatePath), "utf8")
    ) as {
      readonly lastActive?: {
        readonly artifactPath?: string;
        readonly stage?: string;
      };
    };

    assert.equal(result.statusCode, 200);
    assert.equal(payload.lastActiveReset, true);
    assert.equal(
      await exists(path.join(workspaceRoot, diagramArtifact)),
      false
    );
    assert.equal(workflowState.lastActive?.stage, "virtual_simulation");
    assert.equal(workflowState.lastActive?.artifactPath, virtualArtifact);
    assert.deepEqual(resetCalls, [WORKSPACE_SLUG]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow step clear refuses path cleanup when Git boundary is missing", async () => {
  const workspaceRoot = await createRepository();
  const resetCalls: string[] = [];
  try {
    const qualityArtifact = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`;
    const qualityManagedPlan = "doc/TODO/stages/quality-gates/todo-plan.md";
    await writeWorkspaceFile(workspaceRoot, qualityArtifact);
    await writeWorkspaceFile(workspaceRoot, qualityManagedPlan);

    const result = await runClear({
      body: {
        workspacePath: workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
        target: { kind: "workflow_stage", stage: "quality_gates" },
      },
      resetCalls,
      sessionManager: new SessionManager(),
    });
    const payload = result.payload as {
      readonly error?: string;
      readonly gitRollback?: { readonly reason?: string | null };
    };

    assert.equal(result.statusCode, 409);
    assert.equal(
      payload.error,
      "Unable to clear workflow step through Git rollback"
    );
    assert.equal(payload.gitRollback?.reason, "stage_commit_boundary_missing");
    assert.equal(await exists(path.join(workspaceRoot, qualityArtifact)), true);
    assert.equal(
      await exists(path.join(workspaceRoot, qualityManagedPlan)),
      true
    );
    assert.deepEqual(resetCalls, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

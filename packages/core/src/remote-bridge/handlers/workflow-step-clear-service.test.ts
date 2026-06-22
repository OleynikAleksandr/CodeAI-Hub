import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { type Session, SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { WorkflowBoundaryFacade } from "../../workflow/boundary/workflow-boundary-facade";
import { WorkflowStepCommitFacade } from "../../workflow/boundary/workflow-step-commit-facade";
import { bootstrapWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { handleWorkflowStepClear } from "./workflow-step-clear-service";

const WORKSPACE_SLUG = "demo-workspace";
const DESCRIPTION_STAGE = "description";
const VIRTUAL_STAGE = "virtual_simulation";
const DIAGRAM_STAGE = "diagram_modules";
const DESCRIPTION_QUESTIONNAIRE_RE = /Description Questionnaire/u;

const createResponseCapture = () => {
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
  return { response, read: () => ({ payload, statusCode }) };
};

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await new Promise<{
    readonly stdout: string;
  }>((resolve, reject) => {
    execFile("git", args, { cwd: workspaceRoot }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout });
    });
  });
  return stdout.trim();
};

const runClear = async (
  body: unknown,
  sessionManager = new SessionManager()
) => {
  const resetCalls: string[] = [];
  const restoreObservedSessionIds: string[][] = [];
  const capture = createResponseCapture();
  await handleWorkflowStepClear({ body } as Request, capture.response, {
    logger: new Logger("error"),
    resetWorkflowState: (workspaceSlug) => {
      resetCalls.push(workspaceSlug);
    },
    sessionManager,
    workflowBoundaryFacade: {
      restoreBoundary: (params) => {
        restoreObservedSessionIds.push(
          sessionManager.listSessions().map((session: Session) => session.id)
        );
        return Promise.resolve({
          boundaryHash: "abc123",
          clearCommitHash: "def456",
          prunedStages: [params.stage],
          registryPath: "/tmp/boundaries.json",
          stage: params.stage,
        });
      },
    },
  });
  return {
    ...capture.read(),
    resetCalls,
    restoreObservedSessionIds,
    sessionManager,
  };
};

const runRealClear = async (body: unknown) => {
  const resetCalls: string[] = [];
  const capture = createResponseCapture();
  await handleWorkflowStepClear({ body } as Request, capture.response, {
    logger: new Logger("error"),
    resetWorkflowState: (workspaceSlug) => {
      resetCalls.push(workspaceSlug);
    },
    sessionManager: new SessionManager(),
  });
  return { ...capture.read(), resetCalls };
};

const createPureGitWorkflowFixture = async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "clear-git-"));
  const { capsule } = await bootstrapWorkspaceRuntimeCapsule({
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  const boundaryFacade = new WorkflowBoundaryFacade({
    clock: () => "2026-05-25T00:00:00.000Z",
  });
  const stepCommitFacade = new WorkflowStepCommitFacade();

  await boundaryFacade.ensureBoundary({
    stage: DESCRIPTION_STAGE,
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  const finalDescriptionPath = path.join(
    capsule.descriptionRoot.absolutePath,
    "Final_Description.md"
  );
  await writeText(finalDescriptionPath, "# Final Description\n");
  await stepCommitFacade.commitAcceptedStep({
    stage: DESCRIPTION_STAGE,
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });

  await boundaryFacade.ensureBoundary({
    stage: VIRTUAL_STAGE,
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  const virtualSimulationPath = path.join(
    capsule.workspaceCapsuleRoot.absolutePath,
    VIRTUAL_STAGE,
    "virtual-simulation.md"
  );
  await writeText(virtualSimulationPath, "# Virtual Simulation\n");
  await stepCommitFacade.commitAcceptedStep({
    stage: VIRTUAL_STAGE,
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });

  await boundaryFacade.ensureBoundary({
    stage: DIAGRAM_STAGE,
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  const diagramPath = path.join(
    capsule.workspaceCapsuleRoot.absolutePath,
    DIAGRAM_STAGE,
    "product-parts.index.md"
  );
  const scaffoldPath = path.join(
    workspaceRoot,
    "doc",
    "TODO",
    "stages",
    "diagram-modules.md"
  );
  await writeText(diagramPath, "# Diagram Modules\n");
  await writeText(scaffoldPath, "stage scaffold\n");

  return {
    descriptionQuestionnairePath:
      capsule.descriptionQuestionnaireFile.absolutePath,
    diagramPath,
    finalDescriptionPath,
    scaffoldPath,
    virtualSimulationPath,
    workspaceRoot,
  };
};

const clearWorkflowStage = async (params: {
  readonly stage:
    | typeof DESCRIPTION_STAGE
    | typeof VIRTUAL_STAGE
    | typeof DIAGRAM_STAGE;
  readonly workspaceRoot: string;
}) =>
  await runRealClear({
    target: { kind: "workflow_stage", stage: params.stage },
    workspacePath: params.workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });

test("workflow step clear rejects invalid requests", async () => {
  const result = await runClear({
    target: { kind: "workflow_stage", stage: "missing_stage" },
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
  });

  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.payload, { error: "Invalid workflow clear request" });
  assert.deepEqual(result.resetCalls, []);
});

test("workflow step clear restores workflow stages from Git boundary", async () => {
  const sessionManager = new SessionManager();
  const description = sessionManager.createSession(
    "codex",
    "/tmp/demo",
    undefined,
    {
      initiativeSlug: "demo-workspace",
      stage: "description",
    }
  );
  const virtual = sessionManager.createSession(
    "codex",
    "/tmp/demo",
    undefined,
    {
      initiativeSlug: "demo-workspace",
      stage: "virtual_simulation",
    }
  );
  const diagram = sessionManager.createSession(
    "codex",
    "/tmp/demo",
    undefined,
    {
      initiativeSlug: "demo-workspace",
      stage: "diagram_modules",
    }
  );
  const other = sessionManager.createSession("codex", "/tmp/other", undefined, {
    initiativeSlug: "demo-workspace",
    stage: "diagram_modules",
  });

  const result = await runClear(
    {
      target: { kind: "workflow_stage", stage: "virtual_simulation" },
      workspacePath: "/tmp/demo",
      workspaceSlug: "demo-workspace",
    },
    sessionManager
  );

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.payload, {
    cleared: true,
    deletedProviderNativeSessionPaths: [],
    deletedSessionIds: [virtual.id, diagram.id],
    deletedUnifiedSessionPaths: [],
    restore: {
      boundaryHash: "abc123",
      clearCommitHash: "def456",
      prunedStages: ["virtual_simulation"],
      registryPath: "/tmp/boundaries.json",
      stage: "virtual_simulation",
    },
    target: { kind: "workflow_stage", stage: "virtual_simulation" },
    workspaceSlug: "demo-workspace",
  });
  assert.deepEqual(result.resetCalls, ["demo-workspace"]);
  assert.deepEqual(result.restoreObservedSessionIds, [
    [description.id, other.id],
  ]);
  assert.deepEqual(
    result.sessionManager.listSessions().map((session: Session) => session.id),
    [description.id, other.id]
  );
});

test("workflow step clear prunes provider-native workflow sessions only", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "clear-provider-native-")
  );
  const sessionManager = new SessionManager();
  const codex = sessionManager.createSession(
    "codex",
    workspaceRoot,
    "codex-workflow-provider-session",
    {
      initiativeSlug: WORKSPACE_SLUG,
      stage: "virtual_simulation",
    }
  );
  const claude = sessionManager.createSession(
    "claude",
    workspaceRoot,
    "claude-workflow-provider-session",
    {
      initiativeSlug: WORKSPACE_SLUG,
      stage: "diagram_modules",
    }
  );
  const codexWorkflowPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/providers/codex/home/sessions/2026/05/27",
    "rollout-2026-05-27T08-00-00-codex-workflow-provider-session.jsonl"
  );
  const codexTranslationPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/providers/codex/home/sessions/2026/05/27",
    "rollout-2026-05-27T08-00-00-translation-provider-session.jsonl"
  );
  const claudeWorkflowPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/providers/claude/home/.claude/projects/demo",
    "claude-workflow-provider-session.jsonl"
  );
  const codexUnifiedPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/sessions/unified/codex",
    "codex-workflow-provider-session-virtual-simulation.jsonl"
  );
  const codexUnifiedTranslationsPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/sessions/unified/codex",
    "codex-workflow-provider-session-virtual-simulation.translations.jsonl"
  );
  const staleDiagramUnifiedPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/sessions/unified/codex",
    "codex-stale-diagram-modules.jsonl"
  );
  const unrelatedUnifiedPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/sessions/unified/codex",
    "codex-description.jsonl"
  );

  try {
    await writeText(codexWorkflowPath, "{}\n");
    await writeText(codexTranslationPath, "{}\n");
    await writeText(claudeWorkflowPath, "{}\n");
    await writeText(codexUnifiedPath, "{}\n");
    await writeText(codexUnifiedTranslationsPath, "{}\n");
    await writeText(staleDiagramUnifiedPath, "{}\n");
    await writeText(unrelatedUnifiedPath, "{}\n");

    const result = await runClear(
      {
        target: { kind: "workflow_stage", stage: VIRTUAL_STAGE },
        workspacePath: workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      },
      sessionManager
    );

    assert.equal(result.statusCode, 200);
    assert.equal(await fileExists(codexWorkflowPath), false);
    assert.equal(await fileExists(claudeWorkflowPath), false);
    assert.equal(await fileExists(codexTranslationPath), true);
    assert.equal(await fileExists(codexUnifiedPath), false);
    assert.equal(await fileExists(codexUnifiedTranslationsPath), false);
    assert.equal(await fileExists(staleDiagramUnifiedPath), true);
    assert.equal(await fileExists(unrelatedUnifiedPath), true);
    assert.deepEqual(
      (result.payload as { readonly deletedSessionIds: readonly string[] })
        .deletedSessionIds,
      [codex.id, claude.id]
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow step clear routes downstream development-tree node clear through Core", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "clear-node-route-"));
  try {
    const result = await runClear({
      target: {
        codeWorkspacePath: null,
        kind: "development_tree_node",
        workflowPath:
          "development_tree/materialized/product-parts/core/clusters/runtime",
      },
      workspacePath: workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.resetCalls, ["demo-workspace"]);
    assert.deepEqual(
      (result.payload as { readonly deletedWorktreePaths: readonly string[] })
        .deletedWorktreePaths,
      []
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow step clear removes Diagram Modules work through Git rollback", async () => {
  const fixture = await createPureGitWorkflowFixture();
  try {
    const result = await clearWorkflowStage({
      stage: DIAGRAM_STAGE,
      workspaceRoot: fixture.workspaceRoot,
    });

    assert.equal(result.statusCode, 200);
    assert.equal(await fileExists(fixture.finalDescriptionPath), true);
    assert.equal(await fileExists(fixture.virtualSimulationPath), true);
    assert.equal(await fileExists(fixture.diagramPath), false);
    assert.equal(await fileExists(fixture.scaffoldPath), false);
    assert.equal(
      await git(fixture.workspaceRoot, ["status", "--porcelain"]),
      ""
    );
    assert.deepEqual(result.resetCalls, [WORKSPACE_SLUG]);
  } finally {
    await rm(fixture.workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow step clear removes Virtual Simulation and downstream work through Git rollback", async () => {
  const fixture = await createPureGitWorkflowFixture();
  try {
    const result = await clearWorkflowStage({
      stage: VIRTUAL_STAGE,
      workspaceRoot: fixture.workspaceRoot,
    });

    assert.equal(result.statusCode, 200);
    assert.equal(await fileExists(fixture.finalDescriptionPath), true);
    assert.equal(await fileExists(fixture.virtualSimulationPath), false);
    assert.equal(await fileExists(fixture.diagramPath), false);
    assert.equal(await fileExists(fixture.scaffoldPath), false);
    assert.equal(
      await git(fixture.workspaceRoot, ["status", "--porcelain"]),
      ""
    );
    assert.deepEqual(result.resetCalls, [WORKSPACE_SLUG]);
  } finally {
    await rm(fixture.workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow step clear restores Description to a sendable questionnaire boundary through Git rollback", async () => {
  const fixture = await createPureGitWorkflowFixture();
  try {
    const result = await clearWorkflowStage({
      stage: DESCRIPTION_STAGE,
      workspaceRoot: fixture.workspaceRoot,
    });

    assert.equal(result.statusCode, 200);
    assert.match(
      await readFile(fixture.descriptionQuestionnairePath, "utf8"),
      DESCRIPTION_QUESTIONNAIRE_RE
    );
    assert.equal(await fileExists(fixture.finalDescriptionPath), false);
    assert.equal(await fileExists(fixture.virtualSimulationPath), false);
    assert.equal(await fileExists(fixture.diagramPath), false);
    assert.equal(await fileExists(fixture.scaffoldPath), false);
    assert.equal(
      await git(fixture.workspaceRoot, ["status", "--porcelain"]),
      ""
    );
    assert.deepEqual(result.resetCalls, [WORKSPACE_SLUG]);
  } finally {
    await rm(fixture.workspaceRoot, { force: true, recursive: true });
  }
});

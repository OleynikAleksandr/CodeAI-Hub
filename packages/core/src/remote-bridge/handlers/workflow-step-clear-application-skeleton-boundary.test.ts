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
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { WorkflowBoundaryFacade } from "../../workflow/boundary/workflow-boundary-facade";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";
import { WorkflowStepCommitFacade } from "../../workflow/boundary/workflow-step-commit-facade";
import { bootstrapWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";
import { handleWorkflowStepClear } from "./workflow-step-clear-service";

const WORKSPACE_SLUG = "demo-workspace";
const DESCRIPTION_STAGE = "description";
const VIRTUAL_STAGE = "virtual_simulation";
const DIAGRAM_STAGE = "diagram_modules";
const APPLICATION_STAGE = "application_skeleton";
const APPLICATION_SKELETON_RE = /application_skeleton/u;
const PRODUCT_PART_CONTINUITY_RE =
  /development_tree\/materialized\/product-parts\/finder-widget/u;

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
  const { stdout } = await new Promise<{ readonly stdout: string }>(
    (resolve, reject) => {
      execFile("git", args, { cwd: workspaceRoot }, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout });
      });
    }
  );
  return stdout.trim();
};

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

const runClear = async (params: {
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
}) => {
  const resetCalls: string[] = [];
  const capture = createResponseCapture();
  await handleWorkflowStepClear(
    {
      body: {
        target: { kind: "workflow_stage", stage: params.stage },
        workspacePath: params.workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      },
    } as Request,
    capture.response,
    {
      logger: new Logger("error"),
      resetWorkflowState: (workspaceSlug) => {
        resetCalls.push(workspaceSlug);
      },
      sessionManager: new SessionManager(),
    }
  );
  return { ...capture.read(), resetCalls };
};

const buildPath = (workspaceRoot: string, relativePath: string): string =>
  path.join(workspaceRoot, relativePath);

const createFixture = async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "clear-app-"));
  const { capsule } = await bootstrapWorkspaceRuntimeCapsule({
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  const boundaryFacade = new WorkflowBoundaryFacade({
    clock: () => "2026-05-25T00:00:00.000Z",
  });
  const stepCommitFacade = new WorkflowStepCommitFacade();
  const boundaryGit = new WorkflowBoundaryGit();

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
  const virtualSimulationPath = buildPath(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/${VIRTUAL_STAGE}/virtual-simulation.md`
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
  const diagramPath = buildPath(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/${DIAGRAM_STAGE}/product-parts.index.md`
  );
  await writeText(diagramPath, "# Diagram Modules\n");
  await stepCommitFacade.commitAcceptedStep({
    stage: DIAGRAM_STAGE,
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });

  await boundaryFacade.ensureBoundary({
    stage: APPLICATION_STAGE,
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  const applicationSkeletonPath = buildPath(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/${APPLICATION_STAGE}/application-skeleton-map.json`
  );
  const productPartBriefPath = buildPath(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/finder-widget/ProductPartDevelopmentBrief.draft.md`
  );
  const managedDecisionPath = buildPath(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts/finder-widget.json`
  );
  const continuityChainPath = buildPath(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/continuity/development_tree/materialized/product-parts/finder-widget/chain.json`
  );
  const continuityIndexPath = buildPath(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/continuity/index.json`
  );
  const productPartTodoPath = buildPath(
    workspaceRoot,
    "doc/TODO/stages/development-tree/product-parts/finder-widget/todo-plan.md"
  );

  await writeText(applicationSkeletonPath, "{}\n");
  await writeText(productPartBriefPath, "# Product Part Brief\n");
  await writeText(managedDecisionPath, "{}\n");
  await writeText(continuityChainPath, "{}\n");
  await writeText(
    continuityIndexPath,
    `${JSON.stringify(
      {
        version: 1,
        workspaceSlug: WORKSPACE_SLUG,
        updatedAt: "2026-05-25T01:05:00.000Z",
        entries: [
          { stage: APPLICATION_STAGE, rootSessionId: "application-root" },
          {
            stage: "development_tree/materialized/product-parts/finder-widget",
            rootSessionId: "product-part-root",
          },
        ],
      },
      null,
      2
    )}\n`
  );
  await writeText(productPartTodoPath, "# Product Part TODO\n");
  await boundaryGit.commit({
    commitMessage: "docs: accept product part precode",
    paths: [
      `.codeai-hub/${WORKSPACE_SLUG}/${APPLICATION_STAGE}`,
      `.codeai-hub/${WORKSPACE_SLUG}/development_tree`,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts`,
      `.codeai-hub/${WORKSPACE_SLUG}/continuity/development_tree`,
      `.codeai-hub/${WORKSPACE_SLUG}/continuity/index.json`,
      "doc/TODO/stages/development-tree",
    ],
    workspaceRoot,
  });

  return {
    applicationSkeletonPath,
    continuityChainPath,
    continuityIndexPath,
    diagramPath,
    finalDescriptionPath,
    managedDecisionPath,
    productPartBriefPath,
    productPartTodoPath,
    virtualSimulationPath,
    workspaceRoot,
  };
};

test("Application Skeleton clear preserves Product Part lanes created after its boundary", async () => {
  const fixture = await createFixture();
  try {
    const result = await runClear({
      stage: APPLICATION_STAGE,
      workspaceRoot: fixture.workspaceRoot,
    });

    assert.equal(result.statusCode, 200);
    assert.equal(await fileExists(fixture.finalDescriptionPath), true);
    assert.equal(await fileExists(fixture.virtualSimulationPath), true);
    assert.equal(await fileExists(fixture.diagramPath), true);
    assert.equal(await fileExists(fixture.applicationSkeletonPath), false);
    assert.equal(await fileExists(fixture.productPartBriefPath), true);
    assert.equal(await fileExists(fixture.managedDecisionPath), true);
    assert.equal(await fileExists(fixture.continuityChainPath), true);
    assert.equal(await fileExists(fixture.productPartTodoPath), true);
    const continuityIndex = await readFile(fixture.continuityIndexPath, "utf8");
    assert.doesNotMatch(continuityIndex, APPLICATION_SKELETON_RE);
    assert.match(continuityIndex, PRODUCT_PART_CONTINUITY_RE);
    assert.equal(
      await git(fixture.workspaceRoot, ["status", "--porcelain"]),
      ""
    );
    assert.deepEqual(result.resetCalls, [WORKSPACE_SLUG]);
  } finally {
    await rm(fixture.workspaceRoot, { force: true, recursive: true });
  }
});

test("Diagram Modules clear removes Product Part lanes", async () => {
  const fixture = await createFixture();
  try {
    const result = await runClear({
      stage: DIAGRAM_STAGE,
      workspaceRoot: fixture.workspaceRoot,
    });

    assert.equal(result.statusCode, 200);
    assert.equal(await fileExists(fixture.finalDescriptionPath), true);
    assert.equal(await fileExists(fixture.virtualSimulationPath), true);
    assert.equal(await fileExists(fixture.diagramPath), false);
    assert.equal(await fileExists(fixture.applicationSkeletonPath), false);
    assert.equal(await fileExists(fixture.productPartBriefPath), false);
    assert.equal(await fileExists(fixture.managedDecisionPath), false);
    assert.equal(await fileExists(fixture.continuityChainPath), false);
    assert.equal(await fileExists(fixture.productPartTodoPath), false);
    assert.equal(
      await git(fixture.workspaceRoot, ["status", "--porcelain"]),
      ""
    );
    assert.deepEqual(result.resetCalls, [WORKSPACE_SLUG]);
  } finally {
    await rm(fixture.workspaceRoot, { force: true, recursive: true });
  }
});

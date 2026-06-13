import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import {
  PLAN_END as QUALITY_GATES_PLAN_END,
  PLAN_START as QUALITY_GATES_PLAN_START,
  QUALITY_GATES_STAGE_PLAN_PATH,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-model";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { WorkflowStateService } from "./workflow-state-service";

const WORKSPACE_SLUG = "demo-workspace";
type PreliminaryStage = "description" | "virtual_simulation";

const PRELIMINARY_STAGE_ARTIFACTS: Record<PreliminaryStage, string> = {
  description: "Final_Description.md",
  virtual_simulation: "virtual-simulation.md",
};

const PRELIMINARY_STAGE_LABELS: Record<PreliminaryStage, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
};

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const readWorkflowState = async (params: {
  readonly service: WorkflowStateService;
  readonly workspaceRoot: string;
}): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    const req = {
      query: {
        workspacePath: params.workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      },
    } as unknown as Request;
    const res = {
      json(payload: unknown) {
        resolve(payload as Record<string, unknown>);
        return this;
      },
    } as unknown as Response;
    params.service.handleWorkflowStateRead(req, res);
  });

const createQualityGatesContract = (accepted: boolean): string =>
  `${JSON.stringify(
    {
      accepted,
      commands: {
        "qg-secret-scan": {
          availability: "executable",
          desiredStatus: "active",
          id: "qg-secret-scan",
        },
      },
      integrated: false,
      requiredBeforeCommit: ["qg-secret-scan"],
      schema: "codeai-quality-gates-v1",
    },
    null,
    2
  )}\n`;

const createQualityGatesReviewPlan = (): string => `# Quality Gates

${QUALITY_GATES_PLAN_START}
\`\`\`json
{
  "currentTaskId": "quality-gates.phase2.review.task1",
  "expectedCommitMessage": "docs: revise quality gates contract revision 1",
  "lastRecordedCommit": "abc123"
}
\`\`\`
${QUALITY_GATES_PLAN_END}
`;

const createDiagramModulesPlan = (
  currentTaskId: string
): string => `# Diagram Modules

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "currentTaskId": "${currentTaskId}",
  "expectedCommitMessage": null,
  "lastRecordedCommit": "abc123"
}
\`\`\`
<!-- codeai-plan-state:end -->
`;

const writeQualityGatesResearchArtifacts = async (
  workspaceRoot: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.md`,
    "# Quality Gates Research\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.json`,
    `${JSON.stringify(
      {
        recommendations: [],
        schema: "codeai-quality-gates-research-v1",
      },
      null,
      2
    )}\n`
  );
};

const writeQualityGatesArtifacts = async (
  workspaceRoot: string,
  accepted: boolean
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`,
    "# Quality Gates Baseline\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`,
    createQualityGatesContract(accepted)
  );
};

const writePreliminaryArtifact = async (
  workspaceRoot: string,
  stage: PreliminaryStage
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/${stage}/${PRELIMINARY_STAGE_ARTIFACTS[stage]}`,
    `# ${PRELIMINARY_STAGE_LABELS[stage]}\n`
  );
};

const createPreliminaryReviewSession = (params: {
  readonly completed?: boolean;
  readonly sessionManager: SessionManager;
  readonly stage: PreliminaryStage;
  readonly workspaceRoot: string;
}): void => {
  const session = params.sessionManager.createSession(
    "codexCli",
    params.workspaceRoot,
    `provider-${params.stage}`,
    {
      initiativeSlug: WORKSPACE_SLUG,
      stage: params.stage,
    }
  );
  const label = PRELIMINARY_STAGE_LABELS[params.stage];
  params.sessionManager.appendMessage(
    session.id,
    "system",
    `Core: ${label} перешёл в пользовательскую проверку.\nНажмите кнопку «Подтверждаю» ниже.`,
    { tag: "managed-workflow-user-review" }
  );
  if (params.completed) {
    params.sessionManager.appendMessage(
      session.id,
      "system",
      `Core: ${label} завершён и зафиксирован.`,
      { tag: "managed-workflow-complete" }
    );
  }
};

const readUserGateCursor = (
  payload: Record<string, unknown>
): {
  readonly activeUserGate?: Record<string, unknown> | null;
  readonly queuedUserGates?: readonly Record<string, unknown>[];
} => payload.userGateCursor as never;

test("workflow-state exposes Quality Gates research review as active user attention", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-attention-qg-research-review-")
  );
  try {
    await writeQualityGatesResearchArtifacts(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      QUALITY_GATES_STAGE_PLAN_PATH,
      createQualityGatesReviewPlan()
    );
    const payload = await readWorkflowState({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
    });
    const cursor = readUserGateCursor(payload);

    assert.equal(cursor.activeUserGate?.nodeId, "workflow:quality_gates");
    assert.equal(
      cursor.activeUserGate?.reason,
      "managed_stage_review_required"
    );
    assert.equal(cursor.activeUserGate?.inputLocked, false);
    assert.equal(cursor.activeUserGate?.status, "active");
    assert.deepEqual(cursor.activeUserGate?.artifactPaths, [
      `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.md`,
      `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.json`,
    ]);
    assert.deepEqual(cursor.queuedUserGates, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state exposes Diagram Modules managed review as active user attention", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-attention-diagram-review-")
  );
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md",
      createDiagramModulesPlan("diagram-modules.phase2.review.task1")
    );
    const payload = await readWorkflowState({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
    });
    const cursor = readUserGateCursor(payload);

    assert.equal(cursor.activeUserGate?.nodeId, "workflow:diagram_modules");
    assert.equal(
      cursor.activeUserGate?.reason,
      "managed_stage_review_required"
    );
    assert.equal(cursor.activeUserGate?.inputLocked, false);
    assert.equal(cursor.activeUserGate?.status, "active");
    assert.deepEqual(cursor.activeUserGate?.artifactPaths, [
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
    ]);
    assert.deepEqual(cursor.queuedUserGates, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state does not expose Diagram Modules persistent return as user attention", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-attention-diagram-return-")
  );
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md",
      createDiagramModulesPlan("diagram-modules.phase3.user-return.task1")
    );
    const payload = await readWorkflowState({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
    });
    const cursor = readUserGateCursor(payload);

    assert.equal(cursor.activeUserGate, null);
    assert.deepEqual(cursor.queuedUserGates, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state keeps Description review as active user attention after artifact exists", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-attention-description-review-")
  );
  try {
    const sessionManager = new SessionManager();
    await writePreliminaryArtifact(workspaceRoot, "description");
    createPreliminaryReviewSession({
      sessionManager,
      stage: "description",
      workspaceRoot,
    });
    const payload = await readWorkflowState({
      service: new WorkflowStateService({
        logger: new Logger("error"),
        sessionManager,
      }),
      workspaceRoot,
    });
    const cursor = readUserGateCursor(payload);

    assert.equal(cursor.activeUserGate?.nodeId, "workflow:description");
    assert.equal(
      cursor.activeUserGate?.reason,
      "managed_stage_review_required"
    );
    assert.equal(cursor.activeUserGate?.inputLocked, false);
    assert.equal(cursor.activeUserGate?.status, "active");
    assert.deepEqual(cursor.activeUserGate?.artifactPaths, [
      `.codeai-hub/${WORKSPACE_SLUG}/description/Final_Description.md`,
    ]);
    assert.deepEqual(cursor.queuedUserGates, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state removes preliminary user attention after completion", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-attention-description-complete-")
  );
  try {
    const sessionManager = new SessionManager();
    await writePreliminaryArtifact(workspaceRoot, "description");
    createPreliminaryReviewSession({
      completed: true,
      sessionManager,
      stage: "description",
      workspaceRoot,
    });
    const payload = await readWorkflowState({
      service: new WorkflowStateService({
        logger: new Logger("error"),
        sessionManager,
      }),
      workspaceRoot,
    });
    const cursor = readUserGateCursor(payload);

    assert.equal(cursor.activeUserGate, null);
    assert.deepEqual(cursor.queuedUserGates, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state exposes Virtual Simulation review as active user attention", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-attention-virtual-simulation-review-")
  );
  try {
    const sessionManager = new SessionManager();
    await writePreliminaryArtifact(workspaceRoot, "virtual_simulation");
    createPreliminaryReviewSession({
      sessionManager,
      stage: "virtual_simulation",
      workspaceRoot,
    });
    const payload = await readWorkflowState({
      service: new WorkflowStateService({
        logger: new Logger("error"),
        sessionManager,
      }),
      workspaceRoot,
    });
    const cursor = readUserGateCursor(payload);

    assert.equal(cursor.activeUserGate?.nodeId, "workflow:virtual_simulation");
    assert.deepEqual(cursor.activeUserGate?.artifactPaths, [
      `.codeai-hub/${WORKSPACE_SLUG}/virtual_simulation/virtual-simulation.md`,
    ]);
    assert.deepEqual(cursor.queuedUserGates, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state exposes Quality Gates review as active user attention", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-attention-qg-review-")
  );
  try {
    await writeQualityGatesArtifacts(workspaceRoot, false);
    const payload = await readWorkflowState({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
    });
    const cursor = readUserGateCursor(payload);

    assert.equal(cursor.activeUserGate?.nodeId, "workflow:quality_gates");
    assert.equal(
      cursor.activeUserGate?.reason,
      "managed_stage_review_required"
    );
    assert.equal(cursor.activeUserGate?.inputLocked, false);
    assert.equal(cursor.activeUserGate?.status, "active");
    assert.deepEqual(cursor.queuedUserGates, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state does not expose accepted Quality Gates as user attention", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-attention-qg-accepted-")
  );
  try {
    await writeQualityGatesArtifacts(workspaceRoot, true);
    const payload = await readWorkflowState({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
    });
    const cursor = readUserGateCursor(payload);

    assert.equal(cursor.activeUserGate, null);
    assert.deepEqual(cursor.queuedUserGates, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

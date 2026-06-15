import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { APPLICATION_STAGE_PLAN_PATH } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-model";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { WorkflowStateService } from "./workflow-state-service";

const WORKSPACE_SLUG = "demo-workspace";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createManagedStagePlan = (
  currentTaskId: string
): string => `# Managed Stage

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

const readUserGateCursor = (
  payload: Record<string, unknown>
): {
  readonly activeUserGate?: Record<string, unknown> | null;
  readonly queuedUserGates?: readonly Record<string, unknown>[];
} => payload.userGateCursor as never;

test("workflow-state ignores stale completed preliminary review before Application Skeleton review", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-attention-stale-preliminary-")
  );
  try {
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-virtual-simulation",
      {
        initiativeSlug: WORKSPACE_SLUG,
        stage: "virtual_simulation",
      }
    );
    sessionManager.appendMessage(
      session.id,
      "system",
      "Core: Virtual Simulation перешёл в пользовательскую проверку.\nНажмите кнопку «Подтверждаю» ниже.",
      { tag: "managed-workflow-user-review" }
    );
    await writeWorkspaceFile(
      workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH,
      createManagedStagePlan("application-skeleton.phase4.final-review.task1")
    );
    const service = new WorkflowStateService({
      logger: new Logger("error"),
      sessionManager,
    });
    service.record({
      stage: "virtual_simulation",
      timestamp: "2026-06-15T19:03:40.000Z",
      type: "workflow.stage.completed",
      workspaceSlug: WORKSPACE_SLUG,
    });

    const payload = await readWorkflowState({ service, workspaceRoot });
    const cursor = readUserGateCursor(payload);

    assert.equal(
      cursor.activeUserGate?.nodeId,
      "workflow:application_skeleton"
    );
    assert.equal(cursor.activeUserGate?.inputLocked, false);
    assert.deepEqual(cursor.queuedUserGates, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

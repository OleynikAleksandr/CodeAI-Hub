import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
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

const readUserGateCursor = (
  payload: Record<string, unknown>
): {
  readonly activeUserGate?: Record<string, unknown> | null;
  readonly queuedUserGates?: readonly Record<string, unknown>[];
} => payload.userGateCursor as never;

test("workflow-state clears Diagram Modules attention after user review action", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-attention-diagram-action-")
  );
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md",
      createDiagramModulesPlan("diagram-modules.phase2.review.task1")
    );
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-diagram-modules",
      {
        initiativeSlug: WORKSPACE_SLUG,
        stage: "diagram_modules",
      }
    );
    sessionManager.appendMessage(
      session.id,
      "system",
      "Core: Diagram Modules перешёл в пользовательскую проверку.\nНажмите кнопку «Подтверждаю» ниже.",
      { tag: "managed-workflow-user-review" }
    );
    sessionManager.appendMessage(session.id, "user", "подтверждаю");

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

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { Logger } from "../../telemetry/logger";
import { WorkflowStateService } from "./workflow-state-service";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createDescriptionStepJson = (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string =>
  JSON.stringify(
    {
      workspaceSlug: params.workspaceSlug,
      workspacePath: params.workspaceRoot,
      createdAt: "2026-03-18T11:30:00.000Z",
      updatedAt: "2026-03-18T11:30:00.000Z",
      finalPath: `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`,
    },
    null,
    2
  );

const createProductPartsIndex = (partIds: readonly string[]): string =>
  [
    "# Product Parts Index",
    "",
    ...partIds.flatMap((partId) => [
      `### Product Part: ${partId}`,
      `- Title: ${partId}`,
      `- Purpose: Planned ${partId}.`,
      "",
    ]),
  ].join("\n");

const createProductPartMarkdown = (partId: string): string =>
  [
    `# Product Part: ${partId}`,
    "",
    "## Identity",
    "",
    "| Field | Value |",
    "| ----- | ----- |",
    `| Part ID | \`${partId}\` |`,
    `| Product Part | \`${partId}\` |`,
    `| Purpose | Planned ${partId}. |`,
    "",
    "## Purpose",
    "",
    `Planned ${partId}.`,
    "",
    "## Owned Clusters",
    "",
    "## Standalone Modules",
    "",
    "| `module-id` | Responsibility |",
    "| --- | --- |",
    `| \`${partId}-module\` | Implements ${partId}. |`,
    "",
  ].join("\n");

const readWorkflowStatePayload = async (params: {
  readonly service: WorkflowStateService;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<{ readonly statusCode: number; readonly payload: unknown }> =>
  new Promise((resolve) => {
    let statusCode = 200;
    const req = {
      query: {
        workspaceSlug: params.workspaceSlug,
        workspacePath: params.workspaceRoot,
      },
    } as unknown as Request;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        resolve({ statusCode, payload });
      },
    } as unknown as Response;
    params.service.handleWorkflowStateRead(req, res);
  });

test("workflow-state read does not send managed continuation messages", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-read-no-continuation-")
  );
  const workspaceSlug = "demo-workspace";
  const sessionId = "diagram-session";
  const sentMessages: Array<{
    readonly content: string;
    readonly sessionId: string;
  }> = [];

  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
      "# Final Description\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/description-step.json`,
      `${createDescriptionStepJson({ workspaceRoot, workspaceSlug })}\n`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`,
      "# Virtual Simulation\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      createProductPartsIndex(["project-manager", "core-runtime"])
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/project-manager.md`,
      createProductPartMarkdown("project-manager")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/continuity/diagram_modules/root-session/chain.json`,
      `${JSON.stringify(
        {
          rootSessionId: "root-session",
          dialogId: "root-session",
          workspaceSlug,
          stage: "diagram_modules",
          updatedAt: "2026-05-09T12:00:00.000Z",
          segments: [
            {
              createdAt: "2026-05-09T12:00:00.000Z",
              providerId: "claudeCodeCli",
              providerSessionId: "provider-session",
              sessionId,
            },
          ],
        },
        null,
        2
      )}\n`
    );

    const service = new WorkflowStateService({
      logger: new Logger("error"),
      developmentTreeAgentSessions: {
        providerId: "claudeCodeCli",
        gateway: {
          createSessionForWorkflow: () => Promise.resolve(null),
          handleMessage: (targetSessionId, content) => {
            sentMessages.push({ sessionId: targetSessionId, content });
            return Promise.resolve();
          },
        },
      },
    });
    const result = await readWorkflowStatePayload({
      service,
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(result.statusCode, 200);
    assert.deepEqual(sentMessages, []);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

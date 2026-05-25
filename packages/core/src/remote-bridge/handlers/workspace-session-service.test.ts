import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { handleWorkspaceSessionCreate } from "./workspace-session-service";

const WORKSPACE_SLUG = "demo-workspace";

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const createResponse = (): {
  readonly payloads: unknown[];
  readonly res: Response;
  readonly statuses: number[];
} => {
  const payloads: unknown[] = [];
  const statuses: number[] = [];
  const response = {
    json: (payload: unknown) => {
      payloads.push(payload);
      return response;
    },
    status: (statusCode: number) => {
      statuses.push(statusCode);
      return response;
    },
  };
  return { payloads, res: response as unknown as Response, statuses };
};

test("handleWorkspaceSessionCreate creates workflow boundary before stage directories", async () => {
  const workspacePath = await mkdtemp(path.join(tmpdir(), "codeai-session-"));
  try {
    const stagePath = path.join(
      workspacePath,
      ".codeai-hub",
      WORKSPACE_SLUG,
      "virtual_simulation"
    );
    const boundaryCalls: string[] = [];
    let stageDirectoryExistedDuringBoundary = true;
    const { payloads, res, statuses } = createResponse();

    await handleWorkspaceSessionCreate({
      logger: {
        error: () => undefined,
        warn: () => undefined,
      } as unknown as Logger,
      req: {
        body: {
          initiativeSlug: WORKSPACE_SLUG,
          stage: "virtual_simulation",
          workspacePath,
        },
      } as unknown as Request,
      res,
      sessionManager: {
        createSession: () => ({ id: "session-1" }),
      } as unknown as SessionManager,
      workflowBoundaryFacade: {
        ensureBoundary: async (params) => {
          boundaryCalls.push(`${params.workspaceSlug}:${params.stage}`);
          stageDirectoryExistedDuringBoundary = await exists(stagePath);
          return {
            boundaryHash: "abc123",
            created: true,
            registryPath: path.join(workspacePath, "boundaries.json"),
            stage: params.stage,
          };
        },
      },
    });

    assert.deepEqual(boundaryCalls, [`${WORKSPACE_SLUG}:virtual_simulation`]);
    assert.equal(stageDirectoryExistedDuringBoundary, false);
    assert.equal(await exists(stagePath), true);
    assert.deepEqual(statuses, []);
    assert.deepEqual(payloads, [{ sessionId: "session-1" }]);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

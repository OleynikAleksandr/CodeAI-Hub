import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { access, mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
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
    const codexHomePath = path.join(
      workspacePath,
      ".codeai-hub",
      WORKSPACE_SLUG,
      "runtime",
      "providers",
      "codex",
      "home"
    );
    const boundaryCalls: string[] = [];
    let capsuleHomeExistedDuringBoundary = false;
    let capsuleHomeExistedDuringSession = false;
    let stageDirectoryExistedDuringBoundary = true;
    let stageDirectoryExistedDuringSession = false;
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
        createSession: () => {
          capsuleHomeExistedDuringSession = existsSync(codexHomePath);
          stageDirectoryExistedDuringSession = existsSync(stagePath);
          return { id: "session-1" };
        },
      } as unknown as SessionManager,
      workflowBoundaryFacade: {
        ensureBoundary: async (params) => {
          boundaryCalls.push(`${params.workspaceSlug}:${params.stage}`);
          capsuleHomeExistedDuringBoundary = existsSync(codexHomePath);
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
    assert.equal(capsuleHomeExistedDuringBoundary, true);
    assert.equal(stageDirectoryExistedDuringBoundary, false);
    assert.equal(capsuleHomeExistedDuringSession, true);
    assert.equal(stageDirectoryExistedDuringSession, true);
    assert.equal(await exists(stagePath), true);
    assert.deepEqual(statuses, []);
    assert.deepEqual(payloads, [{ sessionId: "session-1" }]);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("handleWorkspaceSessionCreate prepares Application Skeleton artifact directory", async () => {
  const workspacePath = await mkdtemp(path.join(tmpdir(), "codeai-session-"));
  try {
    const workspaceRoot = path.join(
      workspacePath,
      ".codeai-hub",
      WORKSPACE_SLUG
    );
    const stagePath = path.join(workspaceRoot, "application_skeleton");
    const { payloads, res, statuses } = createResponse();

    await mkdir(workspaceRoot, { recursive: true });
    await writeFile(stagePath, "", "utf8");
    await handleWorkspaceSessionCreate({
      logger: {
        error: () => undefined,
        warn: () => undefined,
      } as unknown as Logger,
      req: {
        body: {
          initiativeSlug: WORKSPACE_SLUG,
          stage: "application_skeleton",
          workspacePath,
        },
      } as unknown as Request,
      res,
      sessionManager: {
        createSession: () => ({ id: "session-1" }),
      } as unknown as SessionManager,
      workflowBoundaryFacade: {
        ensureBoundary: () =>
          Promise.resolve({
            boundaryHash: "abc123",
            created: true,
            registryPath: path.join(workspacePath, "boundaries.json"),
            stage: "application_skeleton",
          }),
      },
    });

    assert.equal((await stat(stagePath)).isDirectory(), true);
    assert.deepEqual(statuses, []);
    assert.deepEqual(payloads, [{ sessionId: "session-1" }]);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

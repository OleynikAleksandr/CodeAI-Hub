import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { Logger } from "../../telemetry/logger";
import { HttpApiRouter } from "./http-api-router";

const createResponseCapture = () => {
  let statusCode = 200;
  let payload: unknown = null;

  const response = {
    end() {
      return this;
    },
    json(nextPayload: unknown) {
      payload = nextPayload;
      return this;
    },
    status(nextStatusCode: number) {
      statusCode = nextStatusCode;
      return this;
    },
  } as unknown as Response;

  return {
    response,
    read: () => ({ statusCode, payload }),
  };
};

const MODULE_INVENTORY_MARKDOWN = [
  "# Module Inventory",
  "",
  "## Metadata",
  "- Version: 1",
  "- Stage: diagram_modules",
  "- Updated: 2026-03-19T12:00:00Z",
  "",
  "## Clusters",
  "",
  "## Standalone Modules",
  "",
  "### Module: workspace-shell",
  "- Id: workspace-shell",
  "- Kind: service",
  "- Title: Workspace Shell",
  "- Responsibility: Host the workflow surface.",
  "- Origin: agent",
  "- Status: proposed",
  "",
  "## Simple Relations",
  "",
  "## Assumptions / Open Questions",
  "- None",
  "",
].join("\n");

test("artifact upsert saves module-inventory.md without derived module-map.md", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "http-api-router-artifact-upsert-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    const router = new HttpApiRouter({
      app: {} as never,
      fileDropService: {
        clear() {
          // noop for artifact upsert test
        },
      } as never,
      getStatusInfo: () => ({
        clientCount: 0,
        sessionData: null,
        providerData: null,
      }),
      logger: new Logger("error"),
      onWorkspaceSessionCreated: undefined,
      sessionHandler: {} as never,
      sessionManager: {
        getSession(sessionId: string) {
          if (sessionId !== "session-1") {
            return null;
          }
          return {
            id: sessionId,
            initiativeSlug: workspaceSlug,
            runSlug: null,
            stage: "diagram_modules",
            workspacePath: workspaceRoot,
          };
        },
      } as never,
      sessionStorage: {} as never,
      systemHandler: {} as never,
      workflowEventsService: {} as never,
      workflowStateService: {} as never,
    });

    const capture = createResponseCapture();
    await (
      router as unknown as {
        handleArtifactUpsertSave(req: Request, res: Response): Promise<void>;
      }
    ).handleArtifactUpsertSave(
      {
        body: {
          sessionId: "session-1",
          artifacts: [
            {
              slot: "diagram.modules.inventory",
              markdown: MODULE_INVENTORY_MARKDOWN,
            },
          ],
        },
      } as Request,
      capture.response
    );

    const result = capture.read() as {
      readonly statusCode: number;
      readonly payload: {
        readonly saved: readonly {
          readonly slot: string;
          readonly path: string;
          readonly changed: boolean;
        }[];
      };
    };

    assert.equal(result.statusCode, 200);
    assert.deepEqual(
      result.payload.saved.map((entry) => entry.slot),
      ["diagram.modules.inventory"]
    );

    const inventoryPath = path.join(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/module-inventory.md`
    );
    await mkdir(path.dirname(inventoryPath), { recursive: true });

    const inventoryContent = await readFile(inventoryPath, "utf8");

    assert.equal(inventoryContent, MODULE_INVENTORY_MARKDOWN);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

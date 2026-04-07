import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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

const PRODUCT_PART_MARKDOWN = [
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

const PRODUCT_PARTS_INDEX_MARKDOWN = [
  "# Product Parts Index",
  "",
  "## Metadata",
  "- Version: 1",
  "- Stage: diagram_modules",
  "- Updated: 2026-03-23T12:00:00Z",
  "",
  "## Product Parts",
  "",
  "### Product Part: local-core-runtime",
  "- Id: local-core-runtime",
  "- Title: Local Core Runtime",
  "- Purpose: Run local orchestration and workflow state.",
  "- Status: planned",
  "",
].join("\n");

const FOUNDATION_ENVELOPE_MARKDOWN = [
  "# Foundation Envelope",
  "",
  "## Application Root",
  "- The application root is the local desktop workflow shell.",
  "",
  "## Product Parts",
  "- Local Core Runtime",
  "- Project Manager",
  "",
  "## Shared Zones",
  "- Shared workflow templates and orchestration state.",
  "",
].join("\n");

const FOUNDATION_ENVELOPE_FLOW_JSON = `${JSON.stringify(
  {
    revision: "foundation-rev-1",
    nodes: [
      {
        id: "application-root",
        position: { x: 0, y: 0 },
      },
    ],
  },
  null,
  2
)}\n`;

test("artifact upsert saves diagram modules staged index and dynamic product part files", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "http-api-router-product-parts-upsert-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    const router = new HttpApiRouter({
      app: {} as never,
      fileDropService: {
        clear() {
          // Test stub.
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
              slot: "diagram.modules.index",
              markdown: PRODUCT_PARTS_INDEX_MARKDOWN,
            },
            {
              slot: "diagram.modules.product-part.local-core-runtime",
              markdown: PRODUCT_PART_MARKDOWN,
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
      [
        "diagram.modules.index",
        "diagram.modules.product-part.local-core-runtime",
      ]
    );

    const indexPath = path.join(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`
    );
    const productPartPath = path.join(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/local-core-runtime.md`
    );

    assert.equal(
      await readFile(indexPath, "utf8"),
      PRODUCT_PARTS_INDEX_MARKDOWN
    );
    assert.equal(
      await readFile(productPartPath, "utf8"),
      PRODUCT_PART_MARKDOWN
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("artifact upsert saves foundation envelope markdown and flow sidecar for the stage session", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "http-api-router-foundation-envelope-upsert-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    const router = new HttpApiRouter({
      app: {} as never,
      fileDropService: {
        clear() {
          // Test stub.
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
          if (sessionId !== "session-foundation-envelope") {
            return null;
          }
          return {
            id: sessionId,
            initiativeSlug: workspaceSlug,
            runSlug: null,
            stage: "foundation_envelope",
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
          sessionId: "session-foundation-envelope",
          artifacts: [
            {
              slot: "workspace.foundation_envelope",
              markdown: FOUNDATION_ENVELOPE_MARKDOWN,
            },
            {
              slot: "workspace.foundation_envelope.flow",
              markdown: FOUNDATION_ENVELOPE_FLOW_JSON,
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
      ["workspace.foundation_envelope", "workspace.foundation_envelope.flow"]
    );

    const artifactPath = path.join(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/foundation_envelope/foundation-envelope.md`
    );
    const flowSidecarPath = path.join(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/foundation_envelope/foundation-envelope.flow.json`
    );

    assert.equal(
      await readFile(artifactPath, "utf8"),
      FOUNDATION_ENVELOPE_MARKDOWN
    );
    assert.equal(
      await readFile(flowSidecarPath, "utf8"),
      FOUNDATION_ENVELOPE_FLOW_JSON
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

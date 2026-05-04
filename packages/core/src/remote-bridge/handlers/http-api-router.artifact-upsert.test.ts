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
  "# Product Part: Local Core Runtime",
  "",
  "## Identity",
  "",
  "| Field | Value |",
  "| ----- | ----- |",
  "| Part ID | `local-core-runtime` |",
  "| Product Part | `Local Core Runtime` |",
  "| Purpose | Run local orchestration and workflow state. |",
  "",
  "## Purpose",
  "",
  "Run local orchestration and workflow state.",
  "",
  "## Owned Clusters",
  "",
  "## Standalone Modules",
  "",
  "| `module-id` | Responsibility |",
  "| --- | --- |",
  "| `workspace-shell` | Host the workflow surface. |",
  "",
].join("\n");

const PRODUCT_PART_WITHOUT_NODES_MARKDOWN = PRODUCT_PART_MARKDOWN.replace(
  "| `workspace-shell` | Host the workflow surface. |",
  ""
);

const PRODUCT_PART_WITH_WRONG_ID_MARKDOWN = PRODUCT_PART_MARKDOWN.replace(
  "| Part ID | `local-core-runtime` |",
  "| Part ID | `another-runtime` |"
);

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

const createRouter = (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): HttpApiRouter =>
  new HttpApiRouter({
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
          initiativeSlug: params.workspaceSlug,
          runSlug: null,
          stage: "diagram_modules",
          workspacePath: params.workspaceRoot,
        };
      },
    } as never,
    sessionStorage: {} as never,
    systemHandler: {} as never,
    workflowEventsService: {} as never,
    workflowStateService: {} as never,
  });

const saveArtifacts = async (
  router: HttpApiRouter,
  artifacts: readonly { readonly markdown: string; readonly slot: string }[]
) => {
  const capture = createResponseCapture();
  await (
    router as unknown as {
      handleArtifactUpsertSave(req: Request, res: Response): Promise<void>;
    }
  ).handleArtifactUpsertSave(
    {
      body: {
        sessionId: "session-1",
        artifacts,
      },
    } as Request,
    capture.response
  );
  return capture.read();
};

test("artifact upsert saves diagram modules staged index and dynamic product part files", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "http-api-router-product-parts-upsert-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    const router = createRouter({ workspaceRoot, workspaceSlug });
    const result = (await saveArtifacts(router, [
      {
        slot: "diagram.modules.index",
        markdown: PRODUCT_PARTS_INDEX_MARKDOWN,
      },
      {
        slot: "diagram.modules.product-part.local-core-runtime",
        markdown: PRODUCT_PART_MARKDOWN,
      },
    ])) as {
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

test("artifact upsert rejects product part files with mismatched Part ID", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "http-api-router-product-part-id-validation-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    const router = createRouter({ workspaceRoot, workspaceSlug });
    const result = (await saveArtifacts(router, [
      {
        slot: "diagram.modules.product-part.local-core-runtime",
        markdown: PRODUCT_PART_WITH_WRONG_ID_MARKDOWN,
      },
    ])) as { readonly statusCode: number; readonly payload: { error: string } };

    assert.equal(result.statusCode, 400);
    assert.equal(
      result.payload.error,
      "Product part markdown Part ID must match artifact path: local-core-runtime"
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("artifact upsert rejects product part files without cluster or module nodes", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "http-api-router-product-part-node-validation-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    const router = createRouter({ workspaceRoot, workspaceSlug });
    const result = (await saveArtifacts(router, [
      {
        slot: "diagram.modules.product-part.local-core-runtime",
        markdown: PRODUCT_PART_WITHOUT_NODES_MARKDOWN,
      },
    ])) as { readonly statusCode: number; readonly payload: { error: string } };

    assert.equal(result.statusCode, 400);
    assert.equal(
      result.payload.error,
      "Product part markdown must include at least one valid Cluster or Module node"
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

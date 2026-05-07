import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { WorkflowRevisionStore } from "./workflow-revision-store";
import { isWorkflowRevisionStage } from "./workflow-revision-types";

const DIAGRAM_REVISION_PATH_RE = /diagram-modules\/[a-f0-9]{16}\.json$/u;

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "workflow-revision-store-"));

test("WorkflowRevisionStore saves accepted artifacts and latest snapshot", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  const store = new WorkflowRevisionStore();

  try {
    const result = await store.saveAcceptedRevision({
      artifacts: [
        {
          content: "# Index\n",
          relativePath:
            ".codeai-hub/demo/diagram_modules/product-parts.index.md",
        },
        {
          content: "# Shell\n",
          relativePath:
            ".codeai-hub/demo/diagram_modules/product-parts/shell.md",
        },
      ],
      createdAt: "2026-05-07T00:00:00.000Z",
      metadata: { acceptedBy: "user" },
      stage: "diagram_modules",
      workspaceRoot,
      workspaceSlug: "demo",
    });

    assert.equal(result.snapshot.schema, "codeai-workflow-revision-v1");
    assert.equal(result.snapshot.stage, "diagram_modules");
    assert.equal(result.snapshot.artifacts.length, 2);
    assert.match(result.relativePath, DIAGRAM_REVISION_PATH_RE);

    const record = JSON.parse(await readFile(result.absolutePath, "utf8"));
    assert.equal(record.artifactContents[0].content, "# Index\n");

    const latest = await store.readLatestRevision({
      stage: "diagram_modules",
      workspaceRoot,
    });
    assert.equal(latest?.id, result.snapshot.id);
    assert.equal(latest?.metadata.acceptedBy, "user");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("isWorkflowRevisionStage accepts only revision-backed workflow stages", () => {
  assert.equal(isWorkflowRevisionStage("diagram_modules"), true);
  assert.equal(isWorkflowRevisionStage("description"), false);
});

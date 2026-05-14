import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import {
  commitManagedDocumentationStageIfReady,
  type ManagedDocumentationProgressContext,
} from "./workflow-state-managed-documentation-commit";

const EMPTY_CONTEXT: ManagedDocumentationProgressContext = {
  applicationSkeletonProgress: null,
  diagramModulesProgress: null,
  managedGitStatus: {
    clean: true,
    dirtyByStage: {
      application_skeleton: [],
      diagram_modules: [],
      quality_gates: [],
    },
    dirtyFiles: [],
  },
  qualityGatesProgress: null,
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

test("Application Skeleton repair commit refresh is read-only while commit ownership is disabled", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-repair-refresh-disabled-")
  );
  let transactionCalled = false;

  try {
    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      "# Application Skeleton\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/demo/application_skeleton/application-skeleton-map.json",
      `${JSON.stringify({ accepted: true, materialized: false }, null, 2)}\n`
    );

    const result = await commitManagedDocumentationStageIfReady({
      context: EMPTY_CONTEXT,
      logger: new Logger("error"),
      transaction: {
        commitAcceptedStage: () => {
          transactionCalled = true;
          return Promise.resolve({ status: "committed" });
        },
      },
      workspaceRoot,
      workspaceSlug: "demo",
    });

    assert.equal(transactionCalled, false);
    assert.equal(result.applicationSkeletonProgress?.markdownExists, true);
    assert.equal(result.applicationSkeletonProgress?.mapExists, true);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

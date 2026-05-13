import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";

const MAP_MATERIALIZED_ERROR_RE =
  /application-skeleton-map\.json materialized/u;
const MISSING_CODE_PATH_RE =
  /codePath is missing: product-parts\/project-manager/u;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

test("in-progress Application Skeleton materialization becomes a repairable failure", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-in-progress-")
  );
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      "# Application Skeleton\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/demo/application_skeleton/application-skeleton-map.json",
      `${JSON.stringify(
        {
          accepted: true,
          materialized: false,
          materializationState: "in_progress",
          productParts: [
            {
              codePath: "product-parts/project-manager",
              id: "project-manager",
            },
          ],
          schema: "codeai-application-skeleton-v1",
        },
        null,
        2
      )}\n`
    );

    const progress = await readApplicationSkeletonProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo",
    });
    const errors = progress?.validationErrors.join("\n") ?? "";

    assert.equal(progress?.observedMaterialization, true);
    assert.equal(progress?.materialized, false);
    assert.equal(progress?.materializationState, "failed");
    assert.equal(progress?.substep, "failed");
    assert.match(errors, MAP_MATERIALIZED_ERROR_RE);
    assert.match(errors, MISSING_CODE_PATH_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

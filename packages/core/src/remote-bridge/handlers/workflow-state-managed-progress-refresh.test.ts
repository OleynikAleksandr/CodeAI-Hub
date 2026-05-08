import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import { commitManagedDocumentationStageIfReady } from "./workflow-state-managed-documentation-commit";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createProductPartsIndex = (partIds: readonly string[]): string =>
  [
    "# Product Parts Index",
    "",
    ...partIds.flatMap((partId) => [
      `### Product Part: ${partId}`,
      `- Id: ${partId}`,
      `- Title: ${partId}`,
      `- Purpose: Planned ${partId}.`,
      "- Status: generated",
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

test("managed documentation commit refreshes stale progress before feedback", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-progress-refresh-")
  );
  const workspaceSlug = "demo-workspace";
  const partIds = ["project-manager", "core-runtime"];
  let commitAttempts = 0;

  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      createProductPartsIndex(partIds)
    );
    for (const partId of partIds) {
      await writeWorkspaceFile(
        workspaceRoot,
        `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/${partId}.md`,
        createProductPartMarkdown(partId)
      );
    }

    const result = await commitManagedDocumentationStageIfReady({
      context: {
        applicationSkeletonProgress: null,
        diagramModulesProgress: {
          aggregateReady: false,
          currentPartId: "project-manager",
          generatedCount: 0,
          generatedPartIds: [],
          plannedCount: 2,
          plannedPartIds: partIds,
          productPartDiagnostics: partIds.map((partId) => ({
            error: "Product Part artifact file is missing.",
            partId,
            valid: false,
          })),
          substep: "generate_product_part",
        },
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
      },
      logger: new Logger("error"),
      transaction: {
        commitAcceptedStage: () => {
          commitAttempts += 1;
          return Promise.resolve({ status: "noop" });
        },
      } as never,
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(commitAttempts, 0);
    assert.equal(result.diagramModulesProgress?.aggregateReady, true);
    assert.equal(result.diagramModulesProgress?.generatedCount, 2);
    assert.deepEqual(result.diagramModulesProgress?.generatedPartIds, partIds);
    assert.deepEqual(
      result.diagramModulesProgress?.productPartDiagnostics?.map(
        (diagnostic) => diagnostic.valid
      ),
      [true, true]
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

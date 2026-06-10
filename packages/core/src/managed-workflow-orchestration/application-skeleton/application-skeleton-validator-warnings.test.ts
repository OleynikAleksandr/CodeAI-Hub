import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateApplicationSkeletonManagedArtifacts } from "./application-skeleton-validator";

const WORKSPACE_SLUG = "demo-workspace";

const writeArtifacts = async (
  workspaceRoot: string,
  params: {
    readonly mapJson: Record<string, unknown>;
    readonly markdown: string;
  }
): Promise<void> => {
  const stageDir = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "application_skeleton"
  );
  await mkdir(stageDir, { recursive: true });
  await writeFile(
    path.join(stageDir, "application-skeleton.md"),
    params.markdown,
    "utf8"
  );
  await writeFile(
    path.join(stageDir, "application-skeleton-map.json"),
    JSON.stringify(params.mapJson, null, 2),
    "utf8"
  );
};

test("Application Skeleton validator carries markdown structure issues as review warnings", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-warnings-")
  );
  try {
    await writeArtifacts(workspaceRoot, {
      markdown: "# Wrong Title\n\nNo required sections here.\n",
      mapJson: {
        schema: "codeai-application-skeleton-v1",
        accepted: false,
        materialized: false,
        materializationState: "not_started",
        packageManager: "npm",
        projectFoundation: {
          configFiles: [".gitignore", "package-lock.json", "tsconfig.json"],
          firstWaveEntrypoints: ["product-parts/core-runtime/src/index.ts"],
          installCommand: "npm install --include=dev",
          requiredScripts: ["build", "typecheck", "test:smoke"],
        },
        productParts: [
          {
            partId: "project-manager",
            codePath: "product-parts/project-manager",
          },
        ],
        stack: {
          frameworks: ["React"],
          languages: ["TypeScript"],
          runtimes: ["Node.js"],
        },
      },
    });

    const result = await validateApplicationSkeletonManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, true);
    assert.equal(result.nextAction, "open_user_review");
    assert.ok(result.diagnostics.includes("markdown_wrong_stage"));
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

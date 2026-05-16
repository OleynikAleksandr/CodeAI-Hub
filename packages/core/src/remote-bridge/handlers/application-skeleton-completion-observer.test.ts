import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";

const MATERIALIZED_MARKDOWN = `# Application Skeleton

## Статус

Артефакт утверждён и материализован. Production-tree skeleton создан.
`;

const writeSkeletonArtifacts = async (params: {
  readonly map: Record<string, unknown>;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  const stageDir = path.join(
    params.workspaceRoot,
    `.codeai-hub/${params.workspaceSlug}/application_skeleton`
  );
  await mkdir(stageDir, { recursive: true });
  await writeFile(
    path.join(stageDir, "application-skeleton.md"),
    MATERIALIZED_MARKDOWN,
    "utf8"
  );
  await writeFile(
    path.join(stageDir, "application-skeleton-map.json"),
    `${JSON.stringify(params.map, null, 2)}\n`,
    "utf8"
  );
};

const writeFoundationFiles = async (workspaceRoot: string): Promise<void> => {
  await mkdir(path.join(workspaceRoot, "product-parts/demo/src"), {
    recursive: true,
  });
  await writeFile(
    path.join(workspaceRoot, "product-parts/demo/src/index.ts"),
    "export {};\n",
    "utf8"
  );
  await writeFile(
    path.join(workspaceRoot, "package.json"),
    '{"scripts":{"build":"tsc","lint":"biome check ."}}\n',
    "utf8"
  );
  await writeFile(path.join(workspaceRoot, "package-lock.json"), "{}\n");
  await writeFile(path.join(workspaceRoot, "tsconfig.json"), "{}\n");
};

test("completion observer detects materialized flag flipping to true between turns", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-completion-observer-")
  );
  const workspaceSlug = "demo";

  try {
    await writeSkeletonArtifacts({
      workspaceRoot,
      workspaceSlug,
      map: {
        schema: "codeai-application-skeleton-v1",
        accepted: false,
        materialized: false,
        materializationState: "not_started",
        reviewState: "draft",
        productParts: [],
        materializedPaths: [],
      },
    });
    const before = await readApplicationSkeletonProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(before?.materialized, false);

    await writeFoundationFiles(workspaceRoot);
    await writeSkeletonArtifacts({
      workspaceRoot,
      workspaceSlug,
      map: {
        schema: "codeai-application-skeleton-v1",
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        openQuestions: [],
        packageManager: "npm",
        projectFoundation: {
          configFiles: ["tsconfig.json"],
          firstWaveEntrypoints: ["product-parts/demo/src/index.ts"],
          installCommand: "npm ci",
          requiredScripts: ["build", "lint"],
        },
        reviewState: "materialized",
        productParts: [{ codePath: "product-parts/demo", id: "demo" }],
        materializedPaths: ["product-parts/demo/src/index.ts"],
        sourceRoot: "product-parts",
      },
    });
    const after = await readApplicationSkeletonProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(after?.materialized, true);
    assert.equal(after?.substep, "materialized");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

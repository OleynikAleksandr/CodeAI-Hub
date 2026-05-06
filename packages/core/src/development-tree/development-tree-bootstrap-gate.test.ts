import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readDevelopmentTreeBootstrapGate } from "./development-tree-bootstrap-gate";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const writeJsonArtifact = async (params: {
  readonly content: Record<string, unknown>;
  readonly fileName: string;
  readonly stage: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  await writeWorkspaceFile(
    params.workspaceRoot,
    `.codeai-hub/${params.workspaceSlug}/${params.stage}/${params.fileName}`,
    `${JSON.stringify(params.content, null, 2)}\n`
  );
};

const writeMarkdownArtifact = async (params: {
  readonly fileName: string;
  readonly heading: string;
  readonly stage: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  await writeWorkspaceFile(
    params.workspaceRoot,
    `.codeai-hub/${params.workspaceSlug}/${params.stage}/${params.fileName}`,
    `# ${params.heading}\n`
  );
};

test("development tree stays locked until quality gates are integrated", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "development-tree-bootstrap-gate-")
  );
  const workspaceSlug = "demo";

  try {
    await writeMarkdownArtifact({
      fileName: "application-skeleton.md",
      heading: "Application Skeleton",
      stage: "application_skeleton",
      workspaceRoot,
      workspaceSlug,
    });
    await writeJsonArtifact({
      fileName: "application-skeleton-map.json",
      stage: "application_skeleton",
      workspaceRoot,
      workspaceSlug,
      content: {
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        schema: "codeai-application-skeleton-v1",
      },
    });
    await writeMarkdownArtifact({
      fileName: "quality-gates.md",
      heading: "Quality Gates Baseline",
      stage: "quality_gates",
      workspaceRoot,
      workspaceSlug,
    });
    await writeJsonArtifact({
      fileName: "quality-gates.json",
      stage: "quality_gates",
      workspaceRoot,
      workspaceSlug,
      content: {
        accepted: true,
        commands: {},
        integrated: false,
        integrationState: "not_started",
        schema: "codeai-quality-gates-v1",
      },
    });

    const acceptedOnly = await readDevelopmentTreeBootstrapGate({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(acceptedOnly.qualityGatesProgress?.accepted, true);
    assert.equal(acceptedOnly.qualityGatesProgress?.integrated, false);
    assert.equal(acceptedOnly.unlocked, false);

    await writeJsonArtifact({
      fileName: "quality-gates.json",
      stage: "quality_gates",
      workspaceRoot,
      workspaceSlug,
      content: {
        accepted: true,
        commands: {},
        integrated: true,
        integratedPaths: ["package.json", ".husky/pre-commit"],
        integrationState: "integrated",
        schema: "codeai-quality-gates-v1",
      },
    });

    const integrated = await readDevelopmentTreeBootstrapGate({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(integrated.qualityGatesProgress?.integrated, true);
    assert.equal(integrated.qualityGatesProgress?.substep, "integrated");
    assert.equal(integrated.unlocked, true);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateApplicationSkeletonManagedArtifacts } from "./application-skeleton-validator";

const WORKSPACE_SLUG = "demo-workspace";
const DRAFT_MARKDOWN = `# Application Skeleton

## Overview

Application Skeleton draft contract.
`;
const MISSING_FRAMEWORK_RE = /missing_foundation_field: stack\.frameworks/u;
const MARKDOWN_UNRESOLVED_FRAMEWORK_RE =
  /markdown_unresolved_framework_decision/u;

const createDraftFoundation = (): Record<string, unknown> => ({
  packageManager: "npm",
  projectFoundation: {
    configFiles: ["tsconfig.json"],
    firstWaveEntrypoints: ["product-parts/project-manager/src/index.ts"],
    installCommand: "npm ci",
    requiredScripts: ["build", "typecheck", "test:smoke"],
  },
  repoShape: "workspace-monorepo",
  stack: {
    frameworks: ["React", "CEF launcher"],
    languages: ["TypeScript"],
    runtimes: ["Node.js"],
  },
  openQuestions: [],
});

const createWorkspace = async (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "application-skeleton-framework-"));

const writeApplicationSkeletonArtifacts = async (
  workspaceRoot: string,
  params: {
    readonly mapJson: Record<string, unknown>;
    readonly markdown?: string;
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
    params.markdown ?? DRAFT_MARKDOWN,
    "utf8"
  );
  await writeFile(
    path.join(stageDir, "application-skeleton-map.json"),
    `${JSON.stringify(params.mapJson, null, 2)}\n`,
    "utf8"
  );
};

test("Application Skeleton validator rejects empty frameworks without a framework dialogue question", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await writeApplicationSkeletonArtifacts(workspaceRoot, {
      mapJson: {
        ...createDraftFoundation(),
        schema: "codeai-application-skeleton-v1",
        accepted: false,
        materialized: false,
        materializationState: "not_started",
        openQuestions: [
          {
            id: "confirm_stack_baseline",
            question:
              "Подтвердите Node.js 22 LTS + npm workspaces + TypeScript.",
          },
        ],
        productParts: [
          {
            partId: "project-manager",
            codePath: "product-parts/project-manager",
          },
        ],
        stack: {
          frameworks: [],
          languages: ["TypeScript"],
          runtimes: ["Node.js"],
        },
      },
    });

    const result = await validateApplicationSkeletonManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.nextAction, "repair_current_artifact");
    assert.match(result.diagnostics.join("\n"), MISSING_FRAMEWORK_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Application Skeleton validator rejects unresolved framework prose in Markdown", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await writeApplicationSkeletonArtifacts(workspaceRoot, {
      markdown: `${DRAFT_MARKDOWN}\n## Stack\n\n- **Frameworks:** не зафиксированы в этом черновике\n`,
      mapJson: {
        ...createDraftFoundation(),
        schema: "codeai-application-skeleton-v1",
        accepted: false,
        materialized: false,
        materializationState: "not_started",
        productParts: [
          {
            partId: "project-manager",
            codePath: "product-parts/project-manager",
          },
        ],
      },
    });

    const result = await validateApplicationSkeletonManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.nextAction, "repair_current_artifact");
    assert.match(
      result.diagnostics.join("\n"),
      MARKDOWN_UNRESOLVED_FRAMEWORK_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

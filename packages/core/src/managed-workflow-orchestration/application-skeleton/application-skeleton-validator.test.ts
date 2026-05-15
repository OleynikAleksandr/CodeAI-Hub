import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildApplicationSkeletonBoundaryBlockedMessage,
  buildApplicationSkeletonMaterializationPrompt,
} from "./application-skeleton-prompt-builder";
import { validateApplicationSkeletonManagedArtifacts } from "./application-skeleton-validator";

const WORKSPACE_SLUG = "demo-workspace";

const DRAFT_MARKDOWN = `# Application Skeleton

## Overview

Application Skeleton draft contract.
`;

const MATERIALIZED_MARKDOWN = `# Application Skeleton

## Overview

Application Skeleton is accepted and materialized.

reviewState: materialized
accepted: true
materialized: true
materializationState: materialized
`;

const USER_REVIEW_OPEN_RE = /user review is now open/u;
const ACCEPTED_REQUIRED_RE = /accepted must be true/u;
const REVIEW_STATE_MATERIALIZED_RE = /reviewState must be materialized/u;
const MATERIALIZATION_RE = /materialization/u;
const PARENT_TRAVERSAL_RE = /parent traversal/u;
const NODE_MODULES_RE = /node_modules/u;
const COMMIT_BOUNDARY_RE = /managed commit boundary/u;
const MATERIALIZE_WORKSPACE_RE =
  /Materialize it into the workspace filesystem/u;

const createWorkspace = async (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "application-skeleton-validator-"));

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

test("Application Skeleton validator opens user review for a valid draft contract", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await writeApplicationSkeletonArtifacts(workspaceRoot, {
      mapJson: {
        schema: "codeai-application-skeleton-v1",
        accepted: false,
        materialized: false,
        materializationState: "not_started",
        productParts: [
          {
            partId: "core-runtime",
            codePath: "product-parts/core-runtime",
            clusters: [
              {
                clusterId: "runtime",
                codePath: "product-parts/core-runtime/runtime",
                modules: [
                  {
                    moduleId: "entrypoint",
                    codePath:
                      "product-parts/core-runtime/runtime/entrypoint.ts",
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await validateApplicationSkeletonManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, true);
    assert.equal(result.phase, "draft");
    assert.equal(result.nextAction, "open_user_review");
    assert.match(result.nextPrompt ?? "", USER_REVIEW_OPEN_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Application Skeleton validator rejects premature draft acceptance and materialization", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await writeApplicationSkeletonArtifacts(workspaceRoot, {
      mapJson: {
        schema: "codeai-application-skeleton-v1",
        accepted: false,
        materialized: true,
        materializationState: "materialized",
        productParts: [],
      },
      markdown: `${DRAFT_MARKDOWN}\nmaterialized: true\n`,
    });

    const result = await validateApplicationSkeletonManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.phase, "materialization");
    assert.equal(result.nextAction, "repair_materialization");
    assert.match(result.diagnostics.join("\n"), ACCEPTED_REQUIRED_RE);
    assert.match(result.diagnostics.join("\n"), REVIEW_STATE_MATERIALIZED_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Application Skeleton validator accepts materialized scaffold when declared paths exist", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await mkdir(
      path.join(workspaceRoot, "product-parts/core-runtime/runtime"),
      { recursive: true }
    );
    await writeFile(
      path.join(
        workspaceRoot,
        "product-parts/core-runtime/runtime/entrypoint.ts"
      ),
      "export const runtime = true;\n",
      "utf8"
    );
    await writeApplicationSkeletonArtifacts(workspaceRoot, {
      markdown: MATERIALIZED_MARKDOWN,
      mapJson: {
        schema: "codeai-application-skeleton-v1",
        reviewState: "materialized",
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        materializedPaths: ["product-parts/core-runtime/runtime"],
        productParts: [
          {
            partId: "core-runtime",
            codePath: "product-parts/core-runtime",
            clusters: [
              {
                clusterId: "runtime",
                codePath: "product-parts/core-runtime/runtime",
                modules: [
                  {
                    moduleId: "entrypoint",
                    codePath:
                      "product-parts/core-runtime/runtime/entrypoint.ts",
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await validateApplicationSkeletonManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, true);
    assert.equal(result.phase, "materialization");
    assert.equal(result.nextAction, "open_persistent_return");
    assert.match(result.nextPrompt ?? "", MATERIALIZATION_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Application Skeleton validator blocks unsafe draft paths", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await writeApplicationSkeletonArtifacts(workspaceRoot, {
      mapJson: {
        schema: "codeai-application-skeleton-v1",
        accepted: false,
        materialized: false,
        plannedPaths: ["../outside", "node_modules/generated"],
      },
    });

    const result = await validateApplicationSkeletonManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.nextAction, "repair_current_artifact");
    assert.match(result.diagnostics.join("\n"), PARENT_TRAVERSAL_RE);
    assert.match(result.diagnostics.join("\n"), NODE_MODULES_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Application Skeleton prompt builders expose materialization and boundary contracts", () => {
  assert.match(
    buildApplicationSkeletonMaterializationPrompt({
      workspaceSlug: WORKSPACE_SLUG,
    }),
    MATERIALIZE_WORKSPACE_RE
  );
  assert.match(
    buildApplicationSkeletonBoundaryBlockedMessage("git index locked"),
    COMMIT_BOUNDARY_RE
  );
});

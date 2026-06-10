import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildApplicationSkeletonBoundaryBlockedMessage,
  buildApplicationSkeletonDraftRepairPrompt,
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

const ACCEPTED_REQUIRED_RE = /accepted must be true/u;
const REVIEW_STATE_MATERIALIZED_RE = /reviewState must be materialized/u;
const MATERIALIZATION_RE = /materialization/u;
const PARENT_TRAVERSAL_RE = /parent traversal/u;
const NODE_MODULES_RE = /node_modules/u;
const COMMIT_BOUNDARY_RE = /plan-state boundary/u;
const PLAN_STATE_PROBLEM_RE = /The input is released/u;
const PAIRED_COMMIT_ITEM_RE = /paired `Git Commit: \.\.\.` item/u;
const CANONICAL_MARKDOWN_STRUCTURE_RE = /canonical Markdown section structure/u;
const MATERIALIZE_WORKSPACE_RE =
  /Core now owns deterministic filesystem materialization/u;
const PROJECT_FOUNDATION_RE = /projectFoundation/u;
const PLACEHOLDER_STACK_RE = /placeholder_foundation_field: stack\.frameworks/u;
const createDraftFoundation = (): Record<string, unknown> => ({
  packageManager: "npm",
  projectFoundation: {
    configFiles: [".gitignore", ".npmrc", "package-lock.json", "tsconfig.json"],
    firstWaveEntrypoints: ["product-parts/core-runtime/src/index.ts"],
    installCommand: "npm install --include=dev",
    requiredScripts: ["build", "typecheck", "test:smoke"],
  },
  repoShape: "workspace-monorepo",
  stack: {
    frameworks: ["node"],
    languages: ["TypeScript"],
    runtimes: ["Node.js"],
  },
  openQuestions: [],
});

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

const writeInstallableFoundationFiles = async (
  workspaceRoot: string
): Promise<void> => {
  await mkdir(path.join(workspaceRoot, "product-parts/core-runtime/src"), {
    recursive: true,
  });
  await writeFile(
    path.join(workspaceRoot, "product-parts/core-runtime/src/index.ts"),
    "export {};\n",
    "utf8"
  );
  await mkdir(path.join(workspaceRoot, "local-fixture"), { recursive: true });
  await writeFile(
    path.join(workspaceRoot, "local-fixture/package.json"),
    '{"name":"local-fixture","version":"1.0.0"}\n',
    "utf8"
  );
  await writeFile(
    path.join(workspaceRoot, "package.json"),
    '{"devDependencies":{"local-fixture":"file:./local-fixture"},"scripts":{"build":"node -e \\"process.exit(0)\\"","test:smoke":"node -e \\"process.exit(0)\\"","typecheck":"node -e \\"process.exit(0)\\""}}\n',
    "utf8"
  );
  await writeFile(
    path.join(workspaceRoot, "package-lock.json"),
    '{"lockfileVersion":3,"requires":true,"packages":{"":{"devDependencies":{"local-fixture":"file:./local-fixture"}},"local-fixture":{"version":"1.0.0","dev":true},"node_modules/local-fixture":{"resolved":"local-fixture","link":true}}}\n'
  );
  await writeFile(path.join(workspaceRoot, "tsconfig.json"), "{}\n");
  await writeFile(
    path.join(workspaceRoot, ".gitignore"),
    "node_modules/\ndist/\n.codeai-hub/state/\n"
  );
  await writeFile(path.join(workspaceRoot, ".npmrc"), "include=dev\n");
};

test("Application Skeleton validator opens user review for a valid draft contract", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await writeApplicationSkeletonArtifacts(workspaceRoot, {
      mapJson: {
        ...createDraftFoundation(),
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
    assert.equal(result.nextPrompt, null);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Application Skeleton validator rejects premature draft acceptance and materialization", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await writeApplicationSkeletonArtifacts(workspaceRoot, {
      mapJson: {
        ...createDraftFoundation(),
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
    await writeInstallableFoundationFiles(workspaceRoot);
    await writeApplicationSkeletonArtifacts(workspaceRoot, {
      markdown: MATERIALIZED_MARKDOWN,
      mapJson: {
        ...createDraftFoundation(),
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
        ...createDraftFoundation(),
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

test("Application Skeleton validator blocks incomplete foundation draft", async () => {
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
    assert.match(result.diagnostics.join("\n"), PROJECT_FOUNDATION_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Application Skeleton validator routes draft open questions to user review", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await writeApplicationSkeletonArtifacts(workspaceRoot, {
      mapJson: {
        ...createDraftFoundation(),
        schema: "codeai-application-skeleton-v1",
        accepted: false,
        materialized: false,
        materializationState: "not_started",
        openQuestions: ["React or vanilla UI?"],
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

    assert.equal(result.valid, true);
    assert.deepEqual(result.diagnostics, []);
    assert.equal(result.nextAction, "open_user_review");
    assert.equal(result.nextPrompt, null);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Application Skeleton validator allows unresolved framework choice only as a dialogue question", async () => {
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
            id: "project-manager-launcher-ui",
            question: "Подтверждаете React + CEF для лаунчера Project Manager?",
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

    assert.equal(result.valid, true);
    assert.equal(result.nextAction, "open_user_review");
    assert.equal(result.nextPrompt, null);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Application Skeleton validator rejects placeholder framework choices", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await writeApplicationSkeletonArtifacts(workspaceRoot, {
      mapJson: {
        ...createDraftFoundation(),
        schema: "codeai-application-skeleton-v1",
        accepted: false,
        materialized: false,
        materializationState: "not_started",
        openQuestions: [],
        productParts: [
          {
            partId: "project-manager",
            codePath: "product-parts/project-manager",
          },
        ],
        stack: {
          frameworks: ["launcher/ui/frontend stack pending"],
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
    assert.match(result.diagnostics.join("\n"), PLACEHOLDER_STACK_RE);
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

test("Application Skeleton repair and blocker messages explain Core-owned next actions", () => {
  const draftRepairPrompt = buildApplicationSkeletonDraftRepairPrompt({
    diagnostics: ["markdown_missing_required_section"],
    workspaceSlug: WORKSPACE_SLUG,
  });
  assert.match(draftRepairPrompt, CANONICAL_MARKDOWN_STRUCTURE_RE);
  for (const heading of [
    "# Application Skeleton",
    "## Overview",
    "## Architecture",
    "## Stack",
    "## Product Parts",
    "## Filesystem",
    "## Materialization",
    "## Assumptions",
  ]) {
    assert.match(draftRepairPrompt, new RegExp(heading, "u"));
  }

  const boundaryMessage = buildApplicationSkeletonBoundaryBlockedMessage(
    "Application Skeleton stage plan does not point to an active commit-backed microtask."
  );
  assert.match(boundaryMessage, PAIRED_COMMIT_ITEM_RE);
  assert.match(boundaryMessage, PLAN_STATE_PROBLEM_RE);
});

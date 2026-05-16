import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";
import { readApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import {
  applyTechnicalRootProgressToState,
  resolveWorkflowBlockedStages,
} from "./quality-gates-progress";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const MATERIALIZED_MARKDOWN = `# Application Skeleton

## Статус

Артефакт утверждён и материализован. Production-tree skeleton создан на базе \`product-parts\`.

## Итог

Application Skeleton принят и материализован. Следующий этап может опираться на этот workspace skeleton как на готовую базу для Quality Gates Baseline.
`;
const MARKDOWN_REVIEW_STATE_ERROR_RE =
  /application-skeleton\.md status reviewState must be materialized/;
const STALE_MATERIALIZATION_WORDING_RE = /stale materialization wording/;
const MAP_REVIEW_STATE_ERROR_RE =
  /application-skeleton-map\.json reviewState must be materialized/;
const MAP_MATERIALIZED_ERROR_RE =
  /application-skeleton-map\.json materialized must be true/;
const MISSING_CODE_PATH_RE =
  /application skeleton codePath is missing: product-parts\/project-manager/;
const MISSING_MATERIALIZED_PATH_RE =
  /application skeleton materializedPath is missing: product-parts\/project-manager/;
const MISSING_STANDALONE_MODULE_PATH_RE =
  /application skeleton codePath is missing: product-parts\/project-manager\/modules\/settings/;

const createState = (workspaceSlug: string): WorkflowState => {
  const stages = Object.fromEntries(
    (
      [
        "description",
        "virtual_simulation",
        "diagram_modules",
        "application_skeleton",
        "quality_gates",
      ] as const satisfies readonly WorkflowStageId[]
    ).map((stage) => [
      stage,
      {
        artifacts:
          stage === "virtual_simulation"
            ? [
                {
                  path: ".codeai-hub/demo/virtual_simulation/virtual-simulation.md",
                  updatedAt: "2026-05-06T00:00:00.000Z",
                },
              ]
            : [],
        gates: [],
        stage,
        status: stage === "application_skeleton" ? "completed" : "idle",
        updatedAt: "2026-05-06T00:00:00.000Z",
      },
    ])
  ) as unknown as WorkflowState["stages"];
  return {
    gates: [],
    stages,
    updatedAt: "2026-05-06T00:00:00.000Z",
    workspaceSlug,
  };
};

const writeSkeleton = async (params: {
  readonly map: Record<string, unknown>;
  readonly markdown?: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  await writeWorkspaceFile(
    params.workspaceRoot,
    `.codeai-hub/${params.workspaceSlug}/application_skeleton/application-skeleton.md`,
    params.markdown ?? "# Application Skeleton\n"
  );
  await writeWorkspaceFile(
    params.workspaceRoot,
    `.codeai-hub/${params.workspaceSlug}/application_skeleton/application-skeleton-map.json`,
    `${JSON.stringify(params.map, null, 2)}\n`
  );
};

const writeFoundationFiles = async (workspaceRoot: string): Promise<void> => {
  for (const [relativePath, content] of [
    ["product-parts/project-manager/src/index.ts", "export {};\n"],
    ["package.json", '{"scripts":{"build":"tsc","lint":"biome check ."}}\n'],
    ["package-lock.json", "{}\n"],
    ["tsconfig.json", "{}\n"],
  ] as const) {
    await writeWorkspaceFile(workspaceRoot, relativePath, content);
  }
};

test("accepted application skeleton remains in progress until materialized", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-progress-accepted-")
  );
  const workspaceSlug = "demo";

  try {
    await writeSkeleton({
      workspaceRoot,
      workspaceSlug,
      map: {
        schema: "codeai-application-skeleton-v1",
        accepted: true,
        materialized: false,
        materializationState: "not_started",
        productParts: [],
      },
    });

    const progress = await readApplicationSkeletonProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(progress?.accepted, true);
    assert.equal(progress?.materialized, false);
    assert.equal(progress?.substep, "accepted");

    const state = createState(workspaceSlug);
    const updated = applyTechnicalRootProgressToState({
      applicationSkeletonProgress: progress,
      qualityGatesProgress: null,
      state,
    });
    const blocked = resolveWorkflowBlockedStages({
      applicationSkeletonProgress: progress,
      description: {
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
      },
      diagramModulesProgress: {
        aggregateReady: true,
        generatedCount: 1,
        generatedPartIds: ["project-manager"],
        plannedCount: 1,
        plannedPartIds: ["project-manager"],
        substep: "awaiting_review",
      },
      state: updated,
    });

    assert.equal(updated.stages.application_skeleton.status, "in_progress");
    assert.equal(blocked.quality_gates, true);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("materialized application skeleton completes stage and unlocks quality gates", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-progress-materialized-")
  );
  const workspaceSlug = "demo";

  try {
    await mkdir(path.join(workspaceRoot, "product-parts/project-manager"), {
      recursive: true,
    });
    await mkdir(
      path.join(
        workspaceRoot,
        "product-parts/project-manager/clusters/workflow-ui/modules/step-navigation"
      ),
      { recursive: true }
    );
    await writeFoundationFiles(workspaceRoot);
    await writeSkeleton({
      markdown: MATERIALIZED_MARKDOWN,
      workspaceRoot,
      workspaceSlug,
      map: {
        schema: "codeai-application-skeleton-v1",
        reviewState: "materialized",
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        materializedPaths: ["product-parts/project-manager"],
        openQuestions: [],
        packageManager: "npm",
        productParts: [
          {
            clusters: [
              {
                codePath: "product-parts/project-manager/clusters/workflow-ui",
                id: "workflow-ui",
                modules: [
                  {
                    codePath:
                      "product-parts/project-manager/clusters/workflow-ui/modules/step-navigation",
                    id: "step-navigation",
                  },
                ],
              },
            ],
            codePath: "product-parts/project-manager",
            id: "project-manager",
          },
        ],
        projectFoundation: {
          configFiles: ["tsconfig.json"],
          firstWaveEntrypoints: ["product-parts/project-manager/src/index.ts"],
          installCommand: "npm ci",
          requiredScripts: ["build", "lint"],
        },
        sourceRoot: "product-parts",
      },
    });

    const progress = await readApplicationSkeletonProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(progress?.accepted, true);
    assert.equal(progress?.materialized, true);
    assert.equal(progress?.observedMaterialization, true);
    assert.equal(progress?.substep, "materialized");
    assert.deepEqual(progress?.validationErrors, []);

    const state = createState(workspaceSlug);
    const updated = applyTechnicalRootProgressToState({
      applicationSkeletonProgress: progress,
      qualityGatesProgress: null,
      state,
    });
    const blocked = resolveWorkflowBlockedStages({
      applicationSkeletonProgress: progress,
      description: {
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
      },
      diagramModulesProgress: {
        aggregateReady: true,
        generatedCount: 1,
        generatedPartIds: ["project-manager"],
        plannedCount: 1,
        plannedPartIds: ["project-manager"],
        substep: "awaiting_review",
      },
      state: updated,
    });

    assert.equal(updated.stages.application_skeleton.status, "completed");
    assert.equal(blocked.quality_gates, false);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("observed filesystem materialization fails when markdown remains draft", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-progress-stale-md-")
  );
  const workspaceSlug = "demo";

  try {
    await mkdir(path.join(workspaceRoot, "product-parts/project-manager"), {
      recursive: true,
    });
    await writeSkeleton({
      markdown: `# Application Skeleton

## Status

- \`reviewState\`: \`draft\`
- \`accepted\`: \`false\`
- \`materialized\`: \`false\`
- \`materializationState\`: \`not_started\`

Черновик не фиксирует детали до явного подтверждения.
`,
      workspaceRoot,
      workspaceSlug,
      map: {
        schema: "codeai-application-skeleton-v1",
        reviewState: "materialized",
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        materializedPaths: ["product-parts/project-manager"],
        productParts: [
          {
            codePath: "product-parts/project-manager",
            partId: "project-manager",
          },
        ],
      },
    });

    const progress = await readApplicationSkeletonProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(progress?.observedMaterialization, true);
    assert.equal(progress?.materialized, false);
    assert.equal(progress?.substep, "failed");
    assert.match(
      progress?.validationErrors.join("\n") ?? "",
      MARKDOWN_REVIEW_STATE_ERROR_RE
    );
    assert.match(
      progress?.validationErrors.join("\n") ?? "",
      STALE_MATERIALIZATION_WORDING_RE
    );

    const state = createState(workspaceSlug);
    const updated = applyTechnicalRootProgressToState({
      applicationSkeletonProgress: progress,
      qualityGatesProgress: null,
      state,
    });
    const blocked = resolveWorkflowBlockedStages({
      applicationSkeletonProgress: progress,
      description: {
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
      },
      diagramModulesProgress: {
        aggregateReady: true,
        generatedCount: 1,
        generatedPartIds: ["project-manager"],
        plannedCount: 1,
        plannedPartIds: ["project-manager"],
        substep: "awaiting_review",
      },
      state: updated,
    });

    assert.equal(updated.stages.application_skeleton.status, "in_progress");
    assert.equal(blocked.quality_gates, true);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("observed filesystem materialization fails when json lifecycle remains unmaterialized", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-progress-stale-json-")
  );
  const workspaceSlug = "demo";

  try {
    await mkdir(path.join(workspaceRoot, "product-parts/project-manager"), {
      recursive: true,
    });
    await writeSkeleton({
      markdown: MATERIALIZED_MARKDOWN,
      workspaceRoot,
      workspaceSlug,
      map: {
        schema: "codeai-application-skeleton-v1",
        reviewState: "draft",
        accepted: true,
        materialized: false,
        materializationState: "not_started",
        productParts: [
          {
            codePath: "product-parts/project-manager",
            partId: "project-manager",
          },
        ],
      },
    });

    const progress = await readApplicationSkeletonProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(progress?.observedMaterialization, true);
    assert.equal(progress?.materialized, false);
    assert.equal(progress?.substep, "failed");
    assert.match(
      progress?.validationErrors.join("\n") ?? "",
      MAP_REVIEW_STATE_ERROR_RE
    );
    assert.match(
      progress?.validationErrors.join("\n") ?? "",
      MAP_MATERIALIZED_ERROR_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("materialized application skeleton fails when declared paths are missing", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-progress-missing-path-")
  );
  const workspaceSlug = "demo";

  try {
    await writeSkeleton({
      markdown: MATERIALIZED_MARKDOWN,
      workspaceRoot,
      workspaceSlug,
      map: {
        schema: "codeai-application-skeleton-v1",
        reviewState: "materialized",
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        materializedPaths: ["product-parts/project-manager"],
        productParts: [
          {
            codePath: "product-parts/project-manager",
            partId: "project-manager",
          },
        ],
      },
    });

    const progress = await readApplicationSkeletonProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(progress?.observedMaterialization, true);
    assert.equal(progress?.materialized, false);
    assert.equal(progress?.substep, "failed");
    assert.match(
      progress?.validationErrors.join("\n") ?? "",
      MISSING_CODE_PATH_RE
    );
    assert.match(
      progress?.validationErrors.join("\n") ?? "",
      MISSING_MATERIALIZED_PATH_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("materialized application skeleton fails when standalone module paths are missing", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-progress-standalone-path-")
  );
  const workspaceSlug = "demo";

  try {
    await mkdir(path.join(workspaceRoot, "product-parts/project-manager"), {
      recursive: true,
    });
    await writeSkeleton({
      markdown: MATERIALIZED_MARKDOWN,
      workspaceRoot,
      workspaceSlug,
      map: {
        schema: "codeai-application-skeleton-v1",
        reviewState: "materialized",
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        materializedPaths: ["product-parts/project-manager"],
        productParts: [
          {
            codePath: "product-parts/project-manager",
            partId: "project-manager",
            standaloneModules: [
              {
                codePath: "product-parts/project-manager/modules/settings",
                moduleId: "settings",
              },
            ],
          },
        ],
      },
    });

    const progress = await readApplicationSkeletonProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(progress?.observedMaterialization, true);
    assert.equal(progress?.materialized, false);
    assert.equal(progress?.substep, "failed");
    assert.match(
      progress?.validationErrors.join("\n") ?? "",
      MISSING_STANDALONE_MODULE_PATH_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

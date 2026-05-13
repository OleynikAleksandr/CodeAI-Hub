import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import {
  attachManagedGitStatus,
  attachValidationDirtyGate,
  listDirtyFilesOutsideManagedStage,
  readManagedGitStatus,
} from "./managed-git-stage-gate";
import { resolveWorkflowBlockedStages } from "./quality-gates-progress";

const execFileAsync = promisify(execFile);
const APPLICATION_SKELETON_DIRTY_ERROR_RE =
  /Application Skeleton-owned files: product-parts\/core-runtime\/README\.md/u;
const FORBIDDEN_GIT_IMPERATIVES_RE =
  /commit or clean|git add|git commit|stage these files|npm run plan:commit|do not run git commands/iu;
const CORE_OWNED_DIRTY_GATE_RE =
  /Core has not yet finalized the managed commit for [A-Za-z ]+-owned files/u;
const CONTENT_READINESS_NOTE_RE =
  /respond with a content-readiness note once the artifacts are ready/u;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const initCommittedWorkspace = async (workspaceRoot: string): Promise<void> => {
  await execFileAsync("git", ["init"], { cwd: workspaceRoot });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: workspaceRoot,
  });
  await execFileAsync("git", ["config", "user.name", "CodeAI Test"], {
    cwd: workspaceRoot,
  });
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
  await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
  await execFileAsync("git", ["commit", "-m", "test: initial"], {
    cwd: workspaceRoot,
  });
};

const createWorkflowState = (): WorkflowState =>
  ({
    stages: {
      diagram_modules: { artifacts: [], gates: [], status: "completed" },
      virtual_simulation: {
        artifacts: [
          {
            path: ".codeai-hub/demo/virtual_simulation/virtual-simulation.md",
          },
        ],
        gates: [],
        status: "completed",
      },
    },
  }) as unknown as WorkflowState;

test("managed Git status classifies dirty files by owning managed stage", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-git-stage-gate-")
  );
  const workspaceSlug = "demo";

  try {
    await initCommittedWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/core.md`,
      "# Core\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "product-parts/core-runtime/README.md",
      "# Core Runtime\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nnpm run qg:before-commit\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "scripts/quality-gates/run-gate.mjs",
      "console.log('ok');\n"
    );
    await writeWorkspaceFile(workspaceRoot, "biome.jsonc", "{}\n");
    await writeWorkspaceFile(
      workspaceRoot,
      "node_modules/.package-lock.json",
      "{}\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "scratch/outside-managed.txt",
      "unrelated\n"
    );

    const status = await readManagedGitStatus(workspaceRoot, workspaceSlug);

    assert.equal(status.clean, false);
    assert.deepEqual(status.dirtyByStage.diagram_modules, [
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/core.md`,
    ]);
    assert.deepEqual(status.dirtyByStage.application_skeleton, [
      "product-parts/core-runtime/README.md",
    ]);
    assert.deepEqual(status.dirtyByStage.quality_gates, [
      ".husky/pre-commit",
      "biome.jsonc",
      "scripts/quality-gates/run-gate.mjs",
    ]);
    assert.deepEqual(
      status.dirtyFiles.includes("node_modules/.package-lock.json"),
      false
    );
    assert.deepEqual(
      status.dirtyFiles.includes("scratch/outside-managed.txt"),
      true
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed Git status classifies dynamic Quality Gates integration paths", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-git-stage-gate-qg-dynamic-")
  );
  const workspaceSlug = "demo";

  try {
    await initCommittedWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.json`,
      `${JSON.stringify(
        {
          integratedPaths: [
            "scripts/qg/run.mjs",
            "tsconfig.qg.build.json",
            ".oxlintrc.json",
            "tools/qg/custom-config.json",
          ],
          schema: "codeai-quality-gates-v1",
        },
        null,
        2
      )}\n`
    );
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync("git", ["commit", "-m", "docs: qg contract"], {
      cwd: workspaceRoot,
    });

    await writeWorkspaceFile(
      workspaceRoot,
      "scripts/qg/run.mjs",
      "console.log('ok');\n"
    );
    await writeWorkspaceFile(workspaceRoot, ".oxlintrc.json", "{}\n");
    await writeWorkspaceFile(workspaceRoot, ".oxfmtrc.json", "{}\n");
    await writeWorkspaceFile(workspaceRoot, "tsconfig.qg.build.json", "{}\n");
    await writeWorkspaceFile(
      workspaceRoot,
      "tools/qg/custom-config.json",
      "{}\n"
    );

    const status = await readManagedGitStatus(workspaceRoot, workspaceSlug);

    assert.deepEqual(status.dirtyByStage.quality_gates, [
      ".oxfmtrc.json",
      ".oxlintrc.json",
      "scripts/qg/run.mjs",
      "tools/qg/custom-config.json",
      "tsconfig.qg.build.json",
    ]);
    assert.deepEqual(status.dirtyByStage.diagram_modules, []);
    assert.deepEqual(status.dirtyByStage.application_skeleton, []);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed Git status classifies Application Skeleton declared root scaffold paths", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-git-stage-gate-skeleton-dynamic-")
  );
  const workspaceSlug = "demo";

  try {
    await initCommittedWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton-map.json`,
      `${JSON.stringify(
        {
          accepted: true,
          materializationState: "materialized",
          materialized: true,
          materializedPaths: [
            "product-parts/app/README.md",
            "package.json",
            "tsconfig.base.json",
          ],
          productParts: [{ codePath: "product-parts/app", id: "app" }],
          reviewState: "materialized",
          schema: "codeai-application-skeleton-v1",
        },
        null,
        2
      )}\n`
    );
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync("git", ["commit", "-m", "docs: skeleton contract"], {
      cwd: workspaceRoot,
    });

    await writeWorkspaceFile(
      workspaceRoot,
      "product-parts/app/README.md",
      "# App\n"
    );
    await writeWorkspaceFile(workspaceRoot, "package.json", "{}\n");
    await writeWorkspaceFile(workspaceRoot, "tsconfig.base.json", "{}\n");

    const status = await readManagedGitStatus(workspaceRoot, workspaceSlug);

    assert.deepEqual(status.dirtyByStage.application_skeleton, [
      "package.json",
      "product-parts/app/README.md",
      "tsconfig.base.json",
    ]);
    assert.deepEqual(
      listDirtyFilesOutsideManagedStage(status, "application_skeleton"),
      []
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed Git status ignores volatile Core metadata after restart", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-git-stage-gate-volatile-")
  );
  const workspaceSlug = "demo";

  try {
    await initCommittedWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/description-step.json`,
      `${JSON.stringify(
        {
          workspaceSlug,
          workspacePath: workspaceRoot,
          createdAt: "2026-05-11T12:00:00.000Z",
          updatedAt: "2026-05-11T12:00:00.000Z",
          finalPath: `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
        },
        null,
        2
      )}\n`
    );
    await execFileAsync(
      "git",
      ["add", `.codeai-hub/${workspaceSlug}/description/description-step.json`],
      { cwd: workspaceRoot }
    );
    await execFileAsync("git", ["commit", "-m", "docs: record description"], {
      cwd: workspaceRoot,
    });
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/description-step.json`,
      `${JSON.stringify(
        {
          workspaceSlug,
          workspacePath: workspaceRoot,
          createdAt: "2026-05-11T12:00:00.000Z",
          updatedAt: "2026-05-11T13:33:04.373Z",
          finalPath: `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
        },
        null,
        2
      )}\n`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/state/task-timers.json",
      `${JSON.stringify(
        {
          schemaVersion: 2,
          totals: {
            description: 15,
            diagram_modules: 150,
            virtual_simulation: 10,
          },
        },
        null,
        2
      )}\n`
    );

    const status = await readManagedGitStatus(workspaceRoot, workspaceSlug);

    assert.equal(status.clean, true);
    assert.deepEqual(status.dirtyFiles, []);
    assert.deepEqual(status.dirtyByStage.diagram_modules, []);
    assert.deepEqual(status.dirtyByStage.application_skeleton, []);
    assert.deepEqual(status.dirtyByStage.quality_gates, []);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed dirty files downgrade owning stage progress with precise errors", () => {
  const diagramProgress = attachManagedGitStatus(
    {
      aggregateReady: true,
      generatedCount: 1,
      generatedPartIds: ["core"],
      plannedCount: 1,
      plannedPartIds: ["core"],
      substep: "awaiting_review",
    },
    [".codeai-hub/demo/diagram_modules/product-parts/core.md"]
  ) as unknown as {
    readonly aggregateReady: boolean;
    readonly managedGitDirtyFiles: string[];
  };

  const skeletonProgress = attachValidationDirtyGate(
    {
      materialized: true,
      substep: "materialized",
      validationErrors: [],
    },
    "Application Skeleton",
    ["product-parts/core-runtime/README.md"]
  );

  assert.equal(diagramProgress.aggregateReady, false);
  assert.deepEqual(diagramProgress.managedGitDirtyFiles, [
    ".codeai-hub/demo/diagram_modules/product-parts/core.md",
  ]);
  assert.equal(skeletonProgress?.substep, "failed");
  assert.match(
    skeletonProgress?.validationErrors[0] ?? "",
    APPLICATION_SKELETON_DIRTY_ERROR_RE
  );
});

test("managed dirty-gate error uses neutral content-readiness wording without git imperatives", () => {
  const skeletonProgress = attachValidationDirtyGate(
    {
      materialized: true,
      substep: "materialized",
      validationErrors: [],
    },
    "Application Skeleton",
    ["product-parts/core-runtime/README.md"]
  );

  assert.equal(skeletonProgress?.substep, "failed");
  const error = skeletonProgress?.validationErrors[0] ?? "";
  assert.match(error, CORE_OWNED_DIRTY_GATE_RE);
  assert.match(error, CONTENT_READINESS_NOTE_RE);
  assert.doesNotMatch(error, FORBIDDEN_GIT_IMPERATIVES_RE);
});

test("managed dirty Git does not re-block completed upstream Application Skeleton", () => {
  const cleanBlocked = resolveWorkflowBlockedStages({
    applicationSkeletonProgress: { materialized: true } as never,
    description: {
      finalPath: ".codeai-hub/demo/description/Final_Description.md",
    },
    diagramModulesProgress: { aggregateReady: true } as never,
    managedGitClean: true,
    state: createWorkflowState(),
  });
  const dirtyBlocked = resolveWorkflowBlockedStages({
    applicationSkeletonProgress: { materialized: true } as never,
    description: {
      finalPath: ".codeai-hub/demo/description/Final_Description.md",
    },
    diagramModulesProgress: { aggregateReady: true } as never,
    managedGitClean: false,
    state: createWorkflowState(),
  });
  const dirtyBeforeSkeletonMaterialized = resolveWorkflowBlockedStages({
    applicationSkeletonProgress: { materialized: false } as never,
    description: {
      finalPath: ".codeai-hub/demo/description/Final_Description.md",
    },
    diagramModulesProgress: { aggregateReady: true } as never,
    managedGitClean: false,
    state: createWorkflowState(),
  });

  assert.equal(cleanBlocked.application_skeleton, false);
  assert.equal(cleanBlocked.quality_gates, false);
  assert.equal(dirtyBlocked.application_skeleton, false);
  assert.equal(dirtyBlocked.quality_gates, true);
  assert.equal(dirtyBeforeSkeletonMaterialized.application_skeleton, true);
  assert.equal(dirtyBeforeSkeletonMaterialized.quality_gates, true);
});

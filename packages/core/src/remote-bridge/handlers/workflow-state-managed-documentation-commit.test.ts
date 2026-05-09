import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { ManagedPlanOrchestratorInstaller } from "../../managed-workspace/managed-plan-orchestrator-installer";
import { Logger } from "../../telemetry/logger";
import { WorkflowStateService } from "./workflow-state-service";

const execFileAsync = promisify(execFile);
const CURRENT_TASK_ID_RE = /"currentTaskId":\s*"[^"]+"/u;
const DIAGRAM_MODULES_AUTO_COMMIT_LOG_RE =
  /chore: record managed workspace ledger[\s\S]+docs: update diagram modules product part local-runtime/u;
const DIAGRAM_MODULES_INDEX_COMMIT_LOG_RE =
  /docs: update diagram modules product part index/u;
const APPLICATION_SKELETON_AUTO_COMMIT_LOG_RE =
  /chore: record managed workspace ledger[\s\S]+feat: materialize application skeleton/u;
const QUALITY_GATES_AUTO_COMMIT_LOG_RE =
  /chore: record managed workspace ledger[\s\S]+feat: integrate quality gates baseline/u;
const EXPECTED_COMMIT_MESSAGE_RE = /"expectedCommitMessage":\s*"[^"]+"/u;
const SCRATCH_UNMANAGED_RE = /scratch\//u;
const DIAGRAM_MODULES_COMMIT_SUBJECT_RE =
  /docs: update diagram modules product part/u;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const createProductPartsIndex = (): string =>
  [
    "# Product Parts Index",
    "",
    "### Product Part: local-runtime",
    "- Title: Local Runtime",
    "- Purpose: Runtime shell.",
    "- Status: planned",
    "",
  ].join("\n");

const createProductPart = (): string =>
  [
    "# Product Part: local-runtime",
    "",
    "## Identity",
    "",
    "| Field | Value |",
    "| ----- | ----- |",
    "| Part ID | `local-runtime` |",
    "",
    "## Owned Clusters",
    "",
    "## Standalone Modules",
    "",
    "| `module-id` | Responsibility |",
    "| --- | --- |",
    "| `provider-bridge` | Coordinates providers. |",
    "",
  ].join("\n");

const initManagedWorkspace = async (
  workspaceRoot: string,
  workspaceSlug: string,
  initialStage: "application_skeleton" | "diagram_modules" | "quality_gates"
): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
  await runGit(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
  await writeWorkspaceFile(
    workspaceRoot,
    ".gitignore",
    ".codeai-hub/*/workflow/state.json\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
    "# Final Description\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`,
    "# Virtual Simulation\n"
  );
  await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
    initialStage,
  });
  if (initialStage !== "diagram_modules") {
    await writeDiagramModulesArtifacts(workspaceRoot, workspaceSlug);
  }
  if (initialStage === "quality_gates") {
    await writeApplicationSkeletonArtifacts(workspaceRoot, workspaceSlug);
  }
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, [
    "-c",
    "core.hooksPath=",
    "commit",
    "-m",
    "test: managed baseline",
  ]);
};

const setActivePlanTask = async (
  workspaceRoot: string,
  activePlanPath: string,
  taskId: string,
  expectedCommitMessage: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, activePlanPath);
  const text = await readFile(absolutePath, "utf8");
  await writeFile(
    absolutePath,
    text
      .replace(CURRENT_TASK_ID_RE, `"currentTaskId": "${taskId}"`)
      .replace(
        EXPECTED_COMMIT_MESSAGE_RE,
        `"expectedCommitMessage": "${expectedCommitMessage}"`
      ),
    "utf8"
  );
};

const writeDiagramModulesArtifacts = async (
  workspaceRoot: string,
  workspaceSlug: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
    createProductPartsIndex()
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/local-runtime.md`,
    createProductPart()
  );
};

const writeApplicationSkeletonArtifacts = async (
  workspaceRoot: string,
  workspaceSlug: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton.md`,
    [
      "# Application Skeleton",
      "",
      "| Field | Value |",
      "| --- | --- |",
      "| reviewState | `materialized` |",
      "| accepted | `true` |",
      "| materialized | `true` |",
      "| materializationState | `materialized` |",
      "",
    ].join("\n")
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton-map.json`,
    `${JSON.stringify({
      accepted: true,
      materialized: true,
      materializationState: "materialized",
      materializedPaths: ["product-parts/local-runtime"],
      productParts: [
        { codePath: "product-parts/local-runtime", id: "local-runtime" },
      ],
      reviewState: "materialized",
      schema: "codeai-application-skeleton-v1",
      sourceRoot: "product-parts",
    })}\n`
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "product-parts/local-runtime/README.md",
    "# Local Runtime\n"
  );
};

const writeQualityGatesArtifacts = async (
  workspaceRoot: string,
  workspaceSlug: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.md`,
    "# Quality Gates\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.json`,
    `${JSON.stringify({
      accepted: true,
      commands: { "qg-smoke": { id: "qg-smoke" } },
      integrated: true,
      integrationState: "integrated",
      requiredBeforeCommit: ["qg-smoke"],
      schema: "codeai-quality-gates-v1",
    })}\n`
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "package.json",
    `${JSON.stringify({
      private: true,
      scripts: {
        "plan:commit": "node ./scripts/plan-orchestrator/plan-cli.mjs commit",
        "plan:repair": "node ./scripts/plan-orchestrator/plan-cli.mjs repair",
        "plan:status": "node ./scripts/plan-orchestrator/plan-cli.mjs status",
        "plan:validate":
          "node ./scripts/plan-orchestrator/plan-cli.mjs validate",
        "qg:smoke": 'node -e "process.exit(0)"',
      },
    })}\n`
  );
  await writeWorkspaceFile(
    workspaceRoot,
    ".husky/pre-commit",
    "#!/bin/sh\nnpm run qg:smoke\n"
  );
};

const readWorkflowStatePayload = async (params: {
  readonly service: WorkflowStateService;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<{
  readonly gating?: {
    readonly blocked?: Record<string, boolean>;
  };
}> =>
  new Promise((resolve) => {
    const req = {
      query: {
        workspacePath: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      },
    } as unknown as Request;
    const res = {
      json: (payload: unknown) => resolve(payload as never),
    } as Response;
    params.service.handleWorkflowStateRead(req, res);
  });

test("workflow-state auto-commits valid Diagram Modules artifacts and unlocks Application Skeleton", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-managed-commit-diagram-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    await initManagedWorkspace(workspaceRoot, workspaceSlug, "diagram_modules");
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      createProductPartsIndex()
    );

    const indexPayload = await readWorkflowStatePayload({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(indexPayload.gating?.blocked?.application_skeleton, true);
    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
    assert.match(
      await runGit(workspaceRoot, ["log", "--oneline", "-2"]),
      DIAGRAM_MODULES_INDEX_COMMIT_LOG_RE
    );

    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/local-runtime.md`,
      createProductPart()
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      createProductPartsIndex().replace(
        "- Status: planned",
        "- Status: generated"
      )
    );

    const payload = await readWorkflowStatePayload({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(payload.gating?.blocked?.application_skeleton, false);
    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
    assert.match(
      await runGit(workspaceRoot, ["log", "--oneline", "-2"]),
      DIAGRAM_MODULES_AUTO_COMMIT_LOG_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("workflow-state auto-commits valid Application Skeleton artifacts and unlocks Quality Gates", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-managed-commit-skeleton-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    await initManagedWorkspace(
      workspaceRoot,
      workspaceSlug,
      "application_skeleton"
    );
    await setActivePlanTask(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md",
      "application-skeleton.stream1.task2",
      "feat: materialize application skeleton"
    );
    await runGit(workspaceRoot, ["add", "."]);
    await runGit(workspaceRoot, [
      "-c",
      "core.hooksPath=",
      "commit",
      "-m",
      "test: accept application skeleton draft",
    ]);
    await writeApplicationSkeletonArtifacts(workspaceRoot, workspaceSlug);

    const payload = await readWorkflowStatePayload({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(payload.gating?.blocked?.quality_gates, false);
    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
    assert.match(
      await runGit(workspaceRoot, ["log", "--oneline", "-2"]),
      APPLICATION_SKELETON_AUTO_COMMIT_LOG_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("workflow-state auto-commits valid Quality Gates artifacts", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-managed-commit-quality-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    await initManagedWorkspace(workspaceRoot, workspaceSlug, "quality_gates");
    await setActivePlanTask(
      workspaceRoot,
      "doc/TODO/stages/quality-gates/todo-plan.md",
      "quality-gates.stream1.task2",
      "feat: integrate quality gates baseline"
    );
    await runGit(workspaceRoot, ["add", "."]);
    await runGit(workspaceRoot, [
      "-c",
      "core.hooksPath=",
      "commit",
      "-m",
      "test: accept quality gates draft",
    ]);
    await writeQualityGatesArtifacts(workspaceRoot, workspaceSlug);

    await readWorkflowStatePayload({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
    assert.match(
      await runGit(workspaceRoot, ["log", "--oneline", "-2"]),
      QUALITY_GATES_AUTO_COMMIT_LOG_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("workflow-state refuses auto-commit when dirty files include another path", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-managed-commit-refuse-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    await initManagedWorkspace(workspaceRoot, workspaceSlug, "diagram_modules");
    await writeDiagramModulesArtifacts(workspaceRoot, workspaceSlug);
    await writeWorkspaceFile(workspaceRoot, "scratch/unmanaged.txt", "dirty\n");

    const payload = await readWorkflowStatePayload({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(payload.gating?.blocked?.application_skeleton, true);
    assert.match(
      await runGit(workspaceRoot, ["status", "--short"]),
      SCRATCH_UNMANAGED_RE
    );
    assert.doesNotMatch(
      await runGit(workspaceRoot, ["log", "--oneline", "-1"]),
      DIAGRAM_MODULES_COMMIT_SUBJECT_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

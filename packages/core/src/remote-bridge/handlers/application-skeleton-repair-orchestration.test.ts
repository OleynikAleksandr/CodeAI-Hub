import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedPlanOrchestratorInstaller } from "../../managed-workspace/managed-plan-orchestrator-installer";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { Logger } from "../../telemetry/logger";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import { runApplicationSkeletonRepairOrchestration } from "./application-skeleton-repair-orchestration";
import { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";
import { readManagedGitStatus } from "./managed-git-stage-gate";
import { WorkflowAgentAcceptanceFeedback } from "./workflow-agent-acceptance-feedback";
import { commitManagedDocumentationStageIfReady } from "./workflow-state-managed-documentation-commit";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const APPLICATION_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
const TARGET_ARTIFACT_PATH = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`;
const REPAIR_COMMIT_MESSAGE =
  "docs: repair application skeleton phase3.materialize attempt 1";
const BLOCKED_MATERIALIZE_RE =
  /\[BLOCKED\] `application-skeleton\.phase3\.materialize\.task1`/u;
const EVIDENCE_REPAIR_TASK_RE =
  /"repairTaskId": "application-skeleton\.phase3\.materialize\.repair1\.task1"/u;
const EVIDENCE_STILL_INVALID_RE = /"outcome": "still_invalid"/u;
const REPAIR_FEEDBACK_RE =
  /Core acceptance check failed for Application Skeleton/u;
const REPAIR_TASK_RE =
  /application-skeleton\.phase3\.materialize\.repair1\.task1/u;
const TARGET_ARTIFACT_FEEDBACK_RE = /application-skeleton-map\.json/u;
const VALIDATION_ERROR = "application-skeleton-map.json remains invalid";

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createChains = (): readonly ContinuityChainSummary[] => [
  {
    rootSessionId: "codex-application_skeleton",
    segments: [
      {
        createdAt: "2026-05-11T12:00:00.000Z",
        providerId: "codexCli",
        providerSessionId: "provider-skeleton-session",
        sessionId: "skeleton-session",
      },
    ],
    stage: "application_skeleton",
    updatedAt: "2026-05-11T12:00:00.000Z",
    workspaceSlug: WORKSPACE_SLUG,
  },
];

const createMaterializationPlan = (): string =>
  [
    "# Managed Workspace TODO Plan",
    "",
    "<!-- codeai-plan-state:start -->",
    "```json",
    JSON.stringify(
      {
        schema: "codeai-plan-v1",
        executionScopeStatus: "ACTIVE",
        planId: "managed-workspace-application-skeleton",
        branch: "main",
        baseHead: "TBD",
        lastRecordedCommit: "TBD",
        planningSource: ".codeai-hub/workflow/index.json",
        currentTaskId: "application-skeleton.phase3.materialize.task1",
        expectedCommitMessage: "feat: materialize application skeleton",
        debt: null,
      },
      null,
      2
    ),
    "```",
    "<!-- codeai-plan-state:end -->",
    "",
    "## Phase 3 - Application Skeleton Materialization",
    "",
    "1. [IN_PROGRESS] `application-skeleton.phase3.materialize.task1` Materialize accepted Application Skeleton and stop for Core acceptance (scope: `product-parts/**, .codeai-hub/**/application_skeleton/**`; expected commit: `feat: materialize application skeleton`).",
    "2. [TODO] Git Commit: `feat: materialize application skeleton` (hash: TBD)",
  ].join("\n");

const createFailedProgress = (): ApplicationSkeletonProgressSnapshot => ({
  accepted: true,
  acceptanceCommitted: true,
  mapExists: true,
  mappingReady: true,
  markdownExists: true,
  materializationState: "failed",
  materialized: false,
  observedMaterialization: true,
  substep: "failed",
  validationErrors: [VALIDATION_ERROR],
});

const initManagedWorkspace = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
  await runGit(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
  await runGit(workspaceRoot, ["config", "core.hooksPath", ".husky"]);
  await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
    initialStage: "application_skeleton",
  });
  await writeWorkspaceFile(
    workspaceRoot,
    APPLICATION_PLAN_PATH,
    createMaterializationPlan()
  );
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, [
    "-c",
    "core.hooksPath=",
    "commit",
    "-m",
    "test: managed materialization baseline",
  ]);
};

test("forced Application Skeleton rejection injects repair feedback and commits failed repair evidence", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-forced-rejection-")
  );

  try {
    await initManagedWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      TARGET_ARTIFACT_PATH,
      `${JSON.stringify({ accepted: true, materialized: true }, null, 2)}\n`
    );

    const progress = createFailedProgress();
    const injected = await runApplicationSkeletonRepairOrchestration({
      decision: { kind: "noop", reason: "out_of_scope_phase" },
      logger: new Logger("error"),
      managedGitStatus: await readManagedGitStatus(
        workspaceRoot,
        WORKSPACE_SLUG
      ),
      phase: "phase_3_materialization",
      progress,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const planAfterInjection = await readFile(
      path.join(workspaceRoot, APPLICATION_PLAN_PATH),
      "utf8"
    );
    const feedbackMessages: string[] = [];

    await new WorkflowAgentAcceptanceFeedback(
      new Logger("error")
    ).sendApplicationSkeletonFeedback({
      chains: createChains(),
      gateway: {
        handleMessage: (_sessionId, content) => {
          feedbackMessages.push(
            typeof content === "string"
              ? content
              : (content.content ?? String(content))
          );
          return Promise.resolve();
        },
      },
      progress,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(injected.status, "injected");
    assert.equal(
      injected.injectedRepairTaskId,
      "application-skeleton.phase3.materialize.repair1.task1"
    );
    assert.match(planAfterInjection, REPAIR_TASK_RE);
    assert.match(planAfterInjection, BLOCKED_MATERIALIZE_RE);
    assert.equal(feedbackMessages.length, 1);
    assert.match(feedbackMessages[0] ?? "", REPAIR_FEEDBACK_RE);
    assert.match(feedbackMessages[0] ?? "", TARGET_ARTIFACT_FEEDBACK_RE);

    const evidence = await runApplicationSkeletonRepairOrchestration({
      decision: { kind: "noop", reason: "out_of_scope_phase" },
      logger: new Logger("error"),
      managedGitStatus: await readManagedGitStatus(
        workspaceRoot,
        WORKSPACE_SLUG
      ),
      phase: "phase_3_materialization",
      progress,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    assert.equal(evidence.status, "evidence_written");
    assert.ok(evidence.evidencePath);

    await commitManagedDocumentationStageIfReady({
      context: {
        applicationSkeletonProgress: null,
        diagramModulesProgress: null,
        managedGitStatus: await readManagedGitStatus(
          workspaceRoot,
          WORKSPACE_SLUG
        ),
        qualityGatesProgress: null,
      },
      logger: new Logger("error"),
      transaction: new ManagedDocumentationCommitTransaction(),
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
    assert.match(
      await runGit(workspaceRoot, ["log", "--pretty=%s", "-4"]),
      new RegExp(REPAIR_COMMIT_MESSAGE, "u")
    );
    const evidenceText = await readFile(
      path.join(workspaceRoot, evidence.evidencePath),
      "utf8"
    );
    assert.match(evidenceText, EVIDENCE_REPAIR_TASK_RE);
    assert.match(evidenceText, EVIDENCE_STILL_INVALID_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

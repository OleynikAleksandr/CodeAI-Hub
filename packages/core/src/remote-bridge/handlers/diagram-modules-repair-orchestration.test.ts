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
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import { runDiagramModulesRepairOrchestration } from "./diagram-modules-repair-orchestration";
import { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";
import { readManagedGitStatus } from "./managed-git-stage-gate";
import { WorkflowAgentAcceptanceFeedback } from "./workflow-agent-acceptance-feedback";
import { commitManagedDocumentationStageIfReady } from "./workflow-state-managed-documentation-commit";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const TARGET_ARTIFACT_PATH = `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/local-runtime.md`;
const DIAGRAM_PLAN_PATH = "doc/TODO/stages/diagram-modules/todo-plan.md";
const INDEX_COMMIT_MESSAGE = "docs: update diagram modules product part index";
const REPAIR_COMMIT_MESSAGE =
  "docs: repair diagram modules product part local-runtime attempt 1";
const REPAIR_TASK_RE =
  /diagram-modules\.product-part\.local-runtime\.repair1\.task1/u;
const BLOCKED_PRODUCT_PART_RE =
  /\[BLOCKED\] `diagram-modules\.product-part\.local-runtime`/u;
const EVIDENCE_REPAIR_TASK_RE =
  /"repairTaskId": "diagram-modules\.product-part\.local-runtime\.repair1\.task1"/u;
const EVIDENCE_STILL_INVALID_RE = /"outcome": "still_invalid"/u;
const REPAIR_FEEDBACK_RE =
  /Core rejected the current Diagram Modules artifact/u;
const TARGET_ARTIFACT_FEEDBACK_RE =
  /\.codeai-hub\/demo-workspace\/diagram_modules\/product-parts\/local-runtime\.md/u;

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
    rootSessionId: "codex-diagram_modules",
    segments: [
      {
        createdAt: "2026-05-11T12:00:00.000Z",
        providerId: "codexCli",
        providerSessionId: "provider-diagram-session",
        sessionId: "diagram-session",
      },
    ],
    stage: "diagram_modules",
    updatedAt: "2026-05-11T12:00:00.000Z",
    workspaceSlug: WORKSPACE_SLUG,
  },
];

const createProductPartsIndex = (): string =>
  [
    "# Product Parts Index",
    "",
    "### Product Part: local-runtime",
    "- Id: local-runtime",
    "- Title: Local Runtime",
    "- Purpose: Runtime shell.",
    "- Status: planned",
    "",
  ].join("\n");

const createInvalidProductPart = (): string => "# Product Part: wrong-id\n";

const createRepairPendingProgress = (): DiagramModulesProgressSnapshot => ({
  acceptedPartIds: [],
  activeSubturn: {
    kind: "product_part",
    partId: "local-runtime",
    status: "repair_pending",
  },
  aggregateReady: false,
  currentPartId: "local-runtime",
  expectedArtifactPath: TARGET_ARTIFACT_PATH,
  generatedCount: 0,
  generatedPartIds: [],
  lastValidation: {
    diagnostics: ["Missing Part ID `local-runtime`."],
    expectedArtifactPath: TARGET_ARTIFACT_PATH,
    valid: false,
    validator: "diagram_modules.product_part",
  },
  nextPartId: "local-runtime",
  plannedCount: 1,
  plannedPartIds: ["local-runtime"],
  productPartDiagnostics: [
    {
      error: "Missing Part ID `local-runtime`.",
      partId: "local-runtime",
      path: TARGET_ARTIFACT_PATH,
      valid: false,
    },
  ],
  substep: "generate_product_part",
});

const initManagedWorkspace = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
  await runGit(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
  await runGit(workspaceRoot, ["config", "core.hooksPath", ".husky"]);
  await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
    initialStage: "diagram_modules",
  });
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
    createProductPartsIndex()
  );
  await runGit(workspaceRoot, ["add", "."]);
  await execFileAsync(
    process.execPath,
    [
      path.join(workspaceRoot, "scripts/plan-orchestrator/plan-cli.mjs"),
      "commit",
      INDEX_COMMIT_MESSAGE,
    ],
    { cwd: workspaceRoot }
  );
};

test("forced Diagram Modules rejection injects repair feedback and commits failed repair evidence", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-forced-rejection-")
  );

  try {
    await initManagedWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      TARGET_ARTIFACT_PATH,
      createInvalidProductPart()
    );

    const progress = createRepairPendingProgress();
    const injected = await runDiagramModulesRepairOrchestration({
      logger: new Logger("error"),
      managedGitStatus: await readManagedGitStatus(
        workspaceRoot,
        WORKSPACE_SLUG
      ),
      progress,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const planAfterInjection = await readFile(
      path.join(workspaceRoot, DIAGRAM_PLAN_PATH),
      "utf8"
    );
    const feedbackMessages: string[] = [];

    await new WorkflowAgentAcceptanceFeedback(
      new Logger("error")
    ).sendDiagramModulesFeedback({
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
      "diagram-modules.product-part.local-runtime.repair1.task1"
    );
    assert.match(planAfterInjection, REPAIR_TASK_RE);
    assert.match(planAfterInjection, BLOCKED_PRODUCT_PART_RE);
    assert.equal(feedbackMessages.length, 1);
    assert.match(feedbackMessages[0] ?? "", REPAIR_FEEDBACK_RE);
    assert.match(feedbackMessages[0] ?? "", TARGET_ARTIFACT_FEEDBACK_RE);

    const evidence = await runDiagramModulesRepairOrchestration({
      logger: new Logger("error"),
      managedGitStatus: await readManagedGitStatus(
        workspaceRoot,
        WORKSPACE_SLUG
      ),
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

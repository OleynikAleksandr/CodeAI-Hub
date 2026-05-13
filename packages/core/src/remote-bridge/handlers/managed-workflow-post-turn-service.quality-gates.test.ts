import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { ManagedWorkflowPostTurnService } from "./managed-workflow-post-turn-service";
import { buildQualityGatesRepairFeedbackMessage } from "./quality-gates-contract-feedback";
import {
  evaluateQualityGatesContractGuard,
  type QualityGatesGuardDecision,
} from "./quality-gates-contract-guard";
import { createQualityGatesActionLines } from "./quality-gates-feedback-action-lines";
import { classifyQualityGatesReviewTurn } from "./quality-gates-review-turn-classifier";

const execFileAsync = promisify(execFile);
const QUALITY_GATES_PLAN_PATH = "doc/TODO/stages/quality-gates/todo-plan.md";
const QUALITY_GATES_PHASE3_REPAIR_RE =
  /quality-gates\.phase3\.integration\.repair1\.task1/u;
const QUALITY_GATES_PHASE2_ACCEPTANCE_REPAIR_RE =
  /quality-gates\.phase2\.acceptance\.repair/u;
const QUALITY_GATES_ACTIONABLE_REPAIR_RE =
  /Continue the Phase 3 Quality Gates integration repair/u;
const QUALITY_GATES_WAIT_FOR_ACCEPTANCE_COMMIT_RE =
  /Wait for Core to commit the accepted Quality Gates contract/u;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const git = async (cwd: string, args: readonly string[]): Promise<void> => {
  await execFileAsync("git", [...args], { cwd });
};

test("guard escalates a draft turn without owned diff to repair_no_progress", () => {
  const decision = evaluateQualityGatesContractGuard({
    ownedDirtyFiles: [],
    phase: "phase_1_draft",
    progress: null,
    terminalEventReceived: true,
  });
  assert.equal(decision.kind, "repair_no_progress");
});

test("repair feedback always asks for a concrete next step, never silence", () => {
  const decisions: QualityGatesGuardDecision[] = [
    {
      kind: "repair_no_progress",
      reason: "terminal_no_owned_diff_in_phase_1_draft",
    },
    {
      details: ["quality-gates.json is missing"],
      kind: "repair_invalid_draft",
      reason: "implicit_readiness_with_invalid_draft",
    },
    {
      blockedPaths: ["package.json"],
      kind: "repair_premature_integration",
      reason: "premature_integration_before_acceptance",
    },
  ];
  for (const decision of decisions) {
    const message = buildQualityGatesRepairFeedbackMessage(decision);
    assert.ok(message);
    assert.equal(
      message.includes("do nothing"),
      false,
      `feedback for ${decision.kind} must not tell the agent to do nothing`
    );
  }
});

test("review classifier records revision intent for repair retries that touch owned files", () => {
  const kind = classifyQualityGatesReviewTurn({
    ownedDirtyFiles: [".codeai-hub/demo/quality_gates/quality-gates.json"],
    phase: "phase_2_review",
  });
  assert.equal(kind, "revision");
});

test("guard accepts commit_ready only with complete draft owned diff", () => {
  const decision = evaluateQualityGatesContractGuard({
    ownedDirtyFiles: [
      ".codeai-hub/demo/quality_gates/quality-gates.md",
      ".codeai-hub/demo/quality_gates/quality-gates.json",
    ],
    phase: "phase_1_draft",
    progress: {
      accepted: false,
      acceptanceCommitted: false,
      commandContractReady: true,
      integrated: false,
      integrationState: "draft",
      jsonExists: true,
      markdownExists: true,
      substep: "awaiting_acceptance",
      validationErrors: [],
    },
    terminalEventReceived: true,
  });
  assert.equal(decision.kind, "commit_ready");
});

test("accepted Quality Gates integration feedback is provider-actionable", () => {
  const actionText = createQualityGatesActionLines({
    outOfOwnerDirtyFiles: [],
    progress: {
      acceptanceCommitted: true,
      accepted: true,
      commandContractReady: true,
      integrated: false,
      integrationState: "integrated",
      jsonExists: true,
      markdownExists: true,
      substep: "failed",
      validationErrors: [
        "Quality gate qg-secret-scan is missing from .husky/pre-commit",
      ],
    },
  }).join("\n");

  assert.match(actionText, QUALITY_GATES_ACTIONABLE_REPAIR_RE);
  assert.doesNotMatch(actionText, QUALITY_GATES_WAIT_FOR_ACCEPTANCE_COMMIT_RE);
});

test("post-turn service injects Phase 3 Quality Gates repair after invalid accepted integration", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-post-turn-qg-integration-repair-")
  );
  const workspaceSlug = "demo-workspace";
  const sessionId = "quality-gates-session";
  try {
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "Test User"]);
    await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
    await writeWorkspaceFile(
      workspaceRoot,
      "doc/TODO/workspace.plan.md",
      [
        "# Workspace Plan",
        "",
        "<!-- codeai-workspace-plan-state:start -->",
        "```json",
        JSON.stringify(
          {
            acceptedCommits: [
              {
                message: "docs: accept quality gates contract",
                stage: "quality_gates",
              },
            ],
            activePlanPath: QUALITY_GATES_PLAN_PATH,
            activeStage: "quality_gates",
          },
          null,
          2
        ),
        "```",
        "<!-- codeai-workspace-plan-state:end -->",
      ].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      QUALITY_GATES_PLAN_PATH,
      [
        "# Quality Gates Plan",
        "",
        "<!-- codeai-plan-state:start -->",
        "```json",
        JSON.stringify(
          {
            currentTaskId: "quality-gates.phase3.integration.task1",
            executionScopeStatus: "ACTIVE",
            expectedCommitMessage: "feat: integrate quality gates baseline",
            schema: "codeai-plan-v1",
          },
          null,
          2
        ),
        "```",
        "<!-- codeai-plan-state:end -->",
        "",
        "1. [IN_PROGRESS] `quality-gates.phase3.integration.task1` Integrate.",
        "2. [TODO] Git Commit: `feat: integrate quality gates baseline` (hash: TBD)",
      ].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.md`,
      "# Quality Gates\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.json`,
      `${JSON.stringify(
        {
          accepted: true,
          commands: { "qg-secret-scan": { id: "qg-secret-scan" } },
          integrated: true,
          integratedPaths: [
            "scripts/qg/run.mjs",
            ".oxlintrc.json",
            "tsconfig.qg.build.json",
          ],
          integrationState: "integrated",
          requiredBeforeCommit: ["qg-secret-scan"],
          schema: "codeai-quality-gates-v1",
        },
        null,
        2
      )}\n`
    );
    await git(workspaceRoot, ["add", "."]);
    await git(workspaceRoot, ["commit", "-m", "baseline"]);
    await writeWorkspaceFile(
      workspaceRoot,
      "scripts/qg/run.mjs",
      "console.log('ok');\n"
    );
    await writeWorkspaceFile(workspaceRoot, ".oxlintrc.json", "{}\n");
    await writeWorkspaceFile(workspaceRoot, "tsconfig.qg.build.json", "{}\n");

    const service = new ManagedWorkflowPostTurnService({
      logger: new Logger("error"),
      sessionManager: {
        getSession: () => ({
          initiativeSlug: workspaceSlug,
          stage: "quality_gates",
          workspacePath: workspaceRoot,
        }),
      } as unknown as SessionManager,
    });
    service.handle(sessionId);
    await service.whenIdle(sessionId);

    const planText = await readFile(
      path.join(workspaceRoot, QUALITY_GATES_PLAN_PATH),
      "utf8"
    );
    assert.match(planText, QUALITY_GATES_PHASE3_REPAIR_RE);
    assert.doesNotMatch(planText, QUALITY_GATES_PHASE2_ACCEPTANCE_REPAIR_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("post-turn service repairs accepted in-progress Quality Gates attempts with missing hooks", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-post-turn-qg-in-progress-repair-")
  );
  const workspaceSlug = "demo-workspace";
  const sessionId = "quality-gates-session";
  try {
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "Test User"]);
    await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
    await writeWorkspaceFile(
      workspaceRoot,
      "doc/TODO/workspace.plan.md",
      [
        "# Workspace Plan",
        "",
        "<!-- codeai-workspace-plan-state:start -->",
        "```json",
        JSON.stringify(
          {
            acceptedCommits: [
              {
                message: "docs: accept quality gates contract",
                stage: "quality_gates",
              },
            ],
            activePlanPath: QUALITY_GATES_PLAN_PATH,
            activeStage: "quality_gates",
          },
          null,
          2
        ),
        "```",
        "<!-- codeai-workspace-plan-state:end -->",
      ].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      QUALITY_GATES_PLAN_PATH,
      [
        "# Quality Gates Plan",
        "",
        "<!-- codeai-plan-state:start -->",
        "```json",
        JSON.stringify(
          {
            currentTaskId: "quality-gates.phase3.integration.task1",
            executionScopeStatus: "ACTIVE",
            expectedCommitMessage: "feat: integrate quality gates baseline",
            schema: "codeai-plan-v1",
          },
          null,
          2
        ),
        "```",
        "<!-- codeai-plan-state:end -->",
        "",
        "1. [IN_PROGRESS] `quality-gates.phase3.integration.task1` Integrate.",
        "2. [TODO] Git Commit: `feat: integrate quality gates baseline` (hash: TBD)",
      ].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.md`,
      "# Quality Gates\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.json`,
      `${JSON.stringify(
        {
          accepted: true,
          commands: { "qg-secret-scan": { id: "qg-secret-scan" } },
          integrated: false,
          integratedPaths: ["scripts/qg/run.mjs"],
          integrationState: "draft",
          requiredBeforeCommit: ["qg-secret-scan"],
          schema: "codeai-quality-gates-v1",
        },
        null,
        2
      )}\n`
    );
    await git(workspaceRoot, ["add", "."]);
    await git(workspaceRoot, ["commit", "-m", "baseline"]);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.json`,
      `${JSON.stringify(
        {
          accepted: true,
          commands: { "qg-secret-scan": { id: "qg-secret-scan" } },
          integrated: false,
          integratedPaths: ["scripts/qg/run.mjs"],
          integrationState: "in_progress",
          requiredBeforeCommit: ["qg-secret-scan"],
          schema: "codeai-quality-gates-v1",
        },
        null,
        2
      )}\n`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "scripts/qg/run.mjs",
      "console.log('ok');\n"
    );

    const service = new ManagedWorkflowPostTurnService({
      logger: new Logger("error"),
      sessionManager: {
        getSession: () => ({
          initiativeSlug: workspaceSlug,
          stage: "quality_gates",
          workspacePath: workspaceRoot,
        }),
      } as unknown as SessionManager,
    });
    service.handle(sessionId);
    await service.whenIdle(sessionId);

    const planText = await readFile(
      path.join(workspaceRoot, QUALITY_GATES_PLAN_PATH),
      "utf8"
    );
    assert.match(planText, QUALITY_GATES_PHASE3_REPAIR_RE);
    assert.doesNotMatch(planText, QUALITY_GATES_PHASE2_ACCEPTANCE_REPAIR_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

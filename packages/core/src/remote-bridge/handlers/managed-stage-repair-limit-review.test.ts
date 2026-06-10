import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import { SessionManager } from "../../session-manager";
import {
  handleManagedStageRepairLimitReviewDecision,
  type ManagedStageRepairLimitReviewDeps,
} from "./managed-stage-repair-limit-review";

const WORKSPACE_SLUG = "finderwidget-test01";
const DIAGRAM_PLAN_PATH = "doc/TODO/stages/diagram-modules/todo-plan.md";
const APPLICATION_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
const QUALITY_PLAN_PATH = "doc/TODO/stages/quality-gates/todo-plan.md";
const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const DIAGRAM_REVIEW_STATE_RE =
  /"currentTaskId": "diagram-modules\.phase2\.review\.task1"/u;
const APPLICATION_FINAL_REVIEW_STATE_RE =
  /"currentTaskId": "application-skeleton\.phase4\.final-review\.task1"/u;
const USER_CORRECTIONS_RE = /User corrections:\nRename the failing gate\./u;
const FINAL_REVIEW_MESSAGE_RE = /final user review/u;

const execFileAsync = promisify(execFile);

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<void> => {
  await execFileAsync("git", args, { cwd: workspaceRoot });
};

const initWorkspaceGit = async (workspaceRoot: string): Promise<void> => {
  await git(workspaceRoot, ["init"]);
  await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
  await git(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
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

const writeStagePlan = async (params: {
  readonly currentTaskId: string;
  readonly expectedCommitMessage: string;
  readonly planPath: string;
  readonly workspaceRoot: string;
}): Promise<void> => {
  const state = {
    currentTaskId: params.currentTaskId,
    expectedCommitMessage: params.expectedCommitMessage,
    lastRecordedCommit: "abc1234",
    schema: "codeai-plan-v1",
  };
  await writeWorkspaceFile(
    params.workspaceRoot,
    params.planPath,
    [
      "# Managed Stage TODO Plan",
      "",
      "<!-- codeai-plan-state:start -->",
      "```json",
      JSON.stringify(state, null, 2),
      "```",
      "<!-- codeai-plan-state:end -->",
      "",
      "## Repair Cycle",
      "",
      "### Stream: Core-Gated Repair Attempts",
      "",
      `15. [IN_PROGRESS] \`${params.currentTaskId}\` Repair the rejected managed artifact and stop for Core validation (scope: managed artifacts; expected commit: \`${params.expectedCommitMessage}\`).`,
      `16. [TODO] Git Commit: \`${params.expectedCommitMessage}\` (hash: TBD)`,
      "",
    ].join("\n")
  );
};

const writeWorkspacePlan = (workspaceRoot: string): Promise<void> =>
  writeWorkspaceFile(
    workspaceRoot,
    WORKSPACE_PLAN_PATH,
    [
      "# Workspace Plan",
      "",
      "<!-- codeai-workspace-plan-state:start -->",
      "```json",
      JSON.stringify({ activeStage: "diagram_modules" }, null, 2),
      "```",
      "<!-- codeai-workspace-plan-state:end -->",
      "",
    ].join("\n")
  );

interface DepsHarness {
  readonly coreMessages: { content: string; tag: string }[];
  readonly deps: ManagedStageRepairLimitReviewDeps;
  readonly dialogMessages: { content: string; role: string }[];
  readonly sentInternalMessages: string[];
}

const createDeps = (): DepsHarness => {
  const coreMessages: { content: string; tag: string }[] = [];
  const dialogMessages: { content: string; role: string }[] = [];
  const sentInternalMessages: string[] = [];
  return {
    coreMessages,
    dialogMessages,
    sentInternalMessages,
    deps: {
      eventMessages: {
        appendCoreMessage: (_sessionId, payload) => {
          coreMessages.push({
            content: payload.content,
            tag: payload.tag ?? "",
          });
        },
        appendDialogMessage: (_sessionId, payload) => {
          dialogMessages.push({
            content: String(payload.content),
            role: String(payload.role),
          });
        },
        waitForMessagePersistence: () => Promise.resolve(),
      },
      messageDispatch: {
        sendInternalMessage: (_sessionId, content) => {
          sentInternalMessages.push(content);
          return Promise.resolve();
        },
      },
      qualityGatesStagePlan: new QualityGatesStagePlanController(),
    } as ManagedStageRepairLimitReviewDeps,
  };
};

const createSession = (workspaceRoot: string, stage: string) =>
  new SessionManager().createSession(
    "codexCli",
    workspaceRoot,
    "provider-session-1",
    {
      initiativeSlug: WORKSPACE_SLUG,
      stage,
    }
  );

const readWorkspaceFile = (
  workspaceRoot: string,
  relativePath: string
): Promise<string> => readFile(path.join(workspaceRoot, relativePath), "utf8");

test("diagram modules repair-limit accept advances the stage plan to user review", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "repair-limit-review-")
  );
  try {
    await initWorkspaceGit(workspaceRoot);
    await writeStagePlan({
      currentTaskId: "diagram-modules.phase1.repair.task4",
      expectedCommitMessage: "docs: repair diagram modules artifact attempt 4",
      planPath: DIAGRAM_PLAN_PATH,
      workspaceRoot,
    });
    await writeWorkspacePlan(workspaceRoot);
    const harness = createDeps();
    const handled = await handleManagedStageRepairLimitReviewDecision({
      content: "подтверждаю",
      deps: harness.deps,
      hiddenUserMessage: false,
      intent: "accept",
      session: createSession(workspaceRoot, "diagram_modules"),
    });
    assert.equal(handled, true);
    const planText = await readWorkspaceFile(workspaceRoot, DIAGRAM_PLAN_PATH);
    assert.match(planText, DIAGRAM_REVIEW_STATE_RE);
    assert.equal(
      harness.coreMessages.at(-1)?.tag,
      "managed-workflow-user-review"
    );
    assert.equal(harness.dialogMessages.at(-1)?.role, "user");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("diagram modules repair-limit revision dispatches the user corrections", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "repair-limit-review-")
  );
  try {
    await writeStagePlan({
      currentTaskId: "diagram-modules.phase1.repair.task5",
      expectedCommitMessage: "docs: repair diagram modules artifact attempt 5",
      planPath: DIAGRAM_PLAN_PATH,
      workspaceRoot,
    });
    const harness = createDeps();
    const handled = await handleManagedStageRepairLimitReviewDecision({
      content: "Rename the failing gate.",
      deps: harness.deps,
      hiddenUserMessage: false,
      intent: "revision",
      session: createSession(workspaceRoot, "diagram_modules"),
    });
    assert.equal(handled, true);
    assert.equal(harness.sentInternalMessages.length, 1);
    assert.match(harness.sentInternalMessages[0] ?? "", USER_CORRECTIONS_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("application skeleton repair-limit accept opens the final user review", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "repair-limit-review-")
  );
  try {
    await initWorkspaceGit(workspaceRoot);
    await writeStagePlan({
      currentTaskId: "application-skeleton.phase3.repair.task5",
      expectedCommitMessage:
        "feat: repair application skeleton materialization attempt 5",
      planPath: APPLICATION_PLAN_PATH,
      workspaceRoot,
    });
    await writeWorkspacePlan(workspaceRoot);
    const harness = createDeps();
    const handled = await handleManagedStageRepairLimitReviewDecision({
      content: "подтверждаю",
      deps: harness.deps,
      hiddenUserMessage: false,
      intent: "accept",
      session: createSession(workspaceRoot, "application_skeleton"),
    });
    assert.equal(handled, true);
    const planText = await readWorkspaceFile(
      workspaceRoot,
      APPLICATION_PLAN_PATH
    );
    assert.match(planText, APPLICATION_FINAL_REVIEW_STATE_RE);
    assert.match(
      String(harness.coreMessages.at(-1)?.content),
      FINAL_REVIEW_MESSAGE_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("quality gates repair-limit revision dispatches the user corrections", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "repair-limit-review-")
  );
  try {
    await writeStagePlan({
      currentTaskId: "quality-gates.phase3.repair.task4",
      expectedCommitMessage: "feat: repair quality gates integration attempt 4",
      planPath: QUALITY_PLAN_PATH,
      workspaceRoot,
    });
    const harness = createDeps();
    const handled = await handleManagedStageRepairLimitReviewDecision({
      content: "Rename the failing gate.",
      deps: harness.deps,
      hiddenUserMessage: false,
      intent: "revision",
      session: createSession(workspaceRoot, "quality_gates"),
    });
    assert.equal(handled, true);
    assert.equal(harness.sentInternalMessages.length, 1);
    assert.match(harness.sentInternalMessages[0] ?? "", USER_CORRECTIONS_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("repair-limit dispatcher ignores stages without an open repair attempt", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "repair-limit-review-")
  );
  try {
    await writeStagePlan({
      currentTaskId: "diagram-modules.phase2.review.task1",
      expectedCommitMessage: "docs: open diagram modules user review",
      planPath: DIAGRAM_PLAN_PATH,
      workspaceRoot,
    });
    const harness = createDeps();
    const handled = await handleManagedStageRepairLimitReviewDecision({
      content: "подтверждаю",
      deps: harness.deps,
      hiddenUserMessage: false,
      intent: "accept",
      session: createSession(workspaceRoot, "diagram_modules"),
    });
    assert.equal(handled, false);
    assert.deepEqual(harness.coreMessages, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import { classifyQualityGatesReviewTurn } from "./quality-gates-review-turn-classifier";
import { runQualityGatesRevisionInjection } from "./quality-gates-revision-injection-runner";

const QUALITY_GATES_PLAN_PATH = "doc/TODO/stages/quality-gates/todo-plan.md";
const REVIEW_REVISION_TASK_RE =
  /quality-gates\.phase2\.review\.revision1\.task1/u;
const USER_RETURN_REVISION_TASK_RE =
  /quality-gates\.phase4\.user-return\.revision1\.task1/u;
const USER_RETURN_CURRENT_TASK_RE =
  /"currentTaskId": "quality-gates\.phase4\.user-return\.revision1\.task1"/u;

const writePlanFile = async (
  workspaceRoot: string,
  taskId: string,
  expectedCommit: string,
  phase: string
): Promise<void> => {
  const planPath = path.join(workspaceRoot, QUALITY_GATES_PLAN_PATH);
  await mkdir(path.dirname(planPath), { recursive: true });
  await writeFile(
    planPath,
    [
      "# Managed Workspace TODO Plan",
      "",
      "<!-- codeai-plan-state:start -->",
      "```json",
      JSON.stringify(
        {
          branch: "main",
          currentTaskId: taskId,
          debt: null,
          executionScopeStatus: "ACTIVE",
          expectedCommitMessage: expectedCommit,
          schema: "codeai-plan-v1",
        },
        null,
        2
      ),
      "```",
      "<!-- codeai-plan-state:end -->",
      "",
      `## ${phase}`,
      "",
      `1. [IN_PROGRESS] \`${taskId}\` Active Quality Gates task (scope: \`.codeai-hub/**/quality_gates/**\`; expected commit: \`${expectedCommit}\`).`,
      `2. [TODO] Git Commit: \`${expectedCommit}\` (hash: TBD)`,
      "",
    ].join("\n"),
    "utf8"
  );
};

test("review classifier returns revision when phase 2 has owned diff", () => {
  const kind = classifyQualityGatesReviewTurn({
    ownedDirtyFiles: [".codeai-hub/demo/quality_gates/quality-gates.md"],
    phase: "phase_2_review",
  });
  assert.equal(kind, "revision");
});

test("review classifier returns discussion when phase 2 has no owned diff", () => {
  const kind = classifyQualityGatesReviewTurn({
    ownedDirtyFiles: [],
    phase: "phase_2_review",
  });
  assert.equal(kind, "discussion");
});

test("review classifier returns revision when phase 4 user-return has owned diff", () => {
  const kind = classifyQualityGatesReviewTurn({
    ownedDirtyFiles: [".codeai-hub/demo/quality_gates/quality-gates.md"],
    phase: "phase_4_user_return",
  });
  assert.equal(kind, "revision");
});

test("review classifier returns out_of_scope for non review/user-return phases", () => {
  assert.equal(
    classifyQualityGatesReviewTurn({
      ownedDirtyFiles: [".codeai-hub/demo/quality_gates/quality-gates.md"],
      phase: "phase_1_draft",
    }),
    "out_of_scope"
  );
  assert.equal(
    classifyQualityGatesReviewTurn({
      ownedDirtyFiles: [".codeai-hub/demo/quality_gates/quality-gates.md"],
      phase: "phase_3_integration",
    }),
    "out_of_scope"
  );
});

test("revision injection runner injects review_revision pair from review anchor", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "qg-review-revision-")
  );
  try {
    await writePlanFile(
      workspaceRoot,
      "quality-gates.phase2.review.task1",
      "docs: revise quality gates contract - revision 1",
      "Phase 2 — Quality Gates Contract Review"
    );

    await runQualityGatesRevisionInjection({
      logger: new Logger("error"),
      sessionId: "session-1",
      stage: "quality_gates",
      workspaceRoot,
    });

    const planText = await readFile(
      path.join(workspaceRoot, QUALITY_GATES_PLAN_PATH),
      "utf8"
    );
    assert.match(planText, REVIEW_REVISION_TASK_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("revision injection runner injects user_return_revision pair from phase 4 anchor", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "qg-user-return-revision-")
  );
  try {
    await writePlanFile(
      workspaceRoot,
      "quality-gates.phase4.user-return.task1",
      "docs: revise quality gates user return revision 1",
      "Phase 4 — Persistent Quality Gates User Return"
    );

    await runQualityGatesRevisionInjection({
      logger: new Logger("error"),
      sessionId: "session-2",
      stage: "quality_gates",
      workspaceRoot,
    });

    const planText = await readFile(
      path.join(workspaceRoot, QUALITY_GATES_PLAN_PATH),
      "utf8"
    );
    assert.match(planText, USER_RETURN_REVISION_TASK_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("revision injection runner is a noop for non-anchor task ids", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "qg-revision-noop-")
  );
  try {
    await writePlanFile(
      workspaceRoot,
      "quality-gates.phase1.draft.task1",
      "docs: draft quality gates contract",
      "Phase 1 — Quality Gates Contract Bootstrap"
    );

    await runQualityGatesRevisionInjection({
      logger: new Logger("error"),
      sessionId: "session-3",
      stage: "quality_gates",
      workspaceRoot,
    });

    const planText = await readFile(
      path.join(workspaceRoot, QUALITY_GATES_PLAN_PATH),
      "utf8"
    );
    assert.doesNotMatch(planText, REVIEW_REVISION_TASK_RE);
    assert.doesNotMatch(planText, USER_RETURN_REVISION_TASK_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("revision injection runner advances current task id away from user-return anchor", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "qg-user-return-advance-")
  );
  try {
    await writePlanFile(
      workspaceRoot,
      "quality-gates.phase4.user-return.task1",
      "docs: revise quality gates user return revision 1",
      "Phase 4 — Persistent Quality Gates User Return"
    );

    await runQualityGatesRevisionInjection({
      logger: new Logger("error"),
      sessionId: "session-advance",
      stage: "quality_gates",
      workspaceRoot,
    });

    const planText = await readFile(
      path.join(workspaceRoot, QUALITY_GATES_PLAN_PATH),
      "utf8"
    );
    assert.match(planText, USER_RETURN_CURRENT_TASK_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

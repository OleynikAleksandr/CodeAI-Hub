import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedPlanOrchestratorInstaller } from "../../managed-workspace/managed-plan-orchestrator-installer";
import type { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { injectApplicationSkeletonReviewRevisionPair } from "./managed-documentation-commit-transaction";
import {
  ManagedWorkflowPostTurnService,
  recognizeManagedAcceptanceForStage,
  recognizeManagedContractAcceptancePhrase,
} from "./managed-workflow-post-turn-service";

const execFileAsync = promisify(execFile);
const APPLICATION_SKELETON_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";

test("recogniser matches user-reported colloquial acceptance phrasing", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase(
      "Контракт принимаю, можешь двигаться к фазе 2."
    ),
    "Принимаю контракт"
  );
});

test("recogniser matches all three canonical acceptance phrases", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Принимаю контракт"),
    "Принимаю контракт"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Подтверждаю контракт"),
    "Подтверждаю контракт"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Утверждаю контракт"),
    "Утверждаю контракт"
  );
});

test("recogniser matches inflected forms of the contract noun", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Принимаю контракта условия"),
    "Принимаю контракт"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Утверждаю по контракту"),
    "Утверждаю контракт"
  );
});

test("recogniser rejects messages without acceptance verb", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Контракт хороший"),
    null
  );
  assert.equal(recognizeManagedContractAcceptancePhrase("Контракт"), null);
});

test("recogniser accepts bare verbs without the contract noun (Option C — broaden recognizer)", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Принимаю эту правку"),
    "Принимаю контракт"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Подтверждаю изменения"),
    "Подтверждаю контракт"
  );
});

test("recogniser rejects ambiguous acknowledgements that are not explicit acceptance", () => {
  assert.equal(recognizeManagedContractAcceptancePhrase("Окей"), null);
  assert.equal(recognizeManagedContractAcceptancePhrase("Давай дальше"), null);
  assert.equal(recognizeManagedContractAcceptancePhrase("Все хорошо"), null);
  assert.equal(
    recognizeManagedAcceptanceForStage("quality_gates", "Окей"),
    null
  );
});

test("recogniser accepts bare English acceptance verbs", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("accepted"),
    "Accept Contract"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("I accept"),
    "Accept Contract"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("confirmed"),
    "Accept Contract"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("approve"),
    "Accept Contract"
  );
});

test("recogniser rejects negated acceptance verbs (Russian and English)", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Не принимаю контракт"),
    null
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Не подтверждаю контракт пока"),
    null
  );
  assert.equal(recognizeManagedContractAcceptancePhrase("not accepted"), null);
  assert.equal(recognizeManagedContractAcceptancePhrase("don't accept"), null);
  assert.equal(
    recognizeManagedContractAcceptancePhrase("cannot confirm"),
    null
  );
});

test("recogniser rejects empty and whitespace-only input", () => {
  assert.equal(recognizeManagedContractAcceptancePhrase(""), null);
  assert.equal(recognizeManagedContractAcceptancePhrase("   "), null);
});

test("recogniser rejects long-form prompts that incidentally contain acceptance verbs (release-blocker regression guard)", () => {
  // Core bootstrap prompts are ~100 KB and contain instructional text about
  // the PM "Accept Contract" button; without a length cap the broadened
  // recognizer matches them and intercepts the Application Skeleton session
  // bootstrap, preventing the agent from ever starting.
  const bootstrapStyle = `
You are the Application Skeleton Agent.
Before explicit user acceptance, leave the contract as draft.
After the user clicks the PM "Accept Contract" button (or types "accepted"),
continue with materialization in the same session.
`.repeat(20);
  assert.ok(bootstrapStyle.length > 200);
  assert.equal(recognizeManagedContractAcceptancePhrase(bootstrapStyle), null);
});

test("stage-gated recogniser matches inside acceptance-eligible stages", () => {
  assert.equal(
    recognizeManagedAcceptanceForStage(
      "application_skeleton",
      "Принимаю контракт"
    ),
    "Принимаю контракт"
  );
  assert.equal(
    recognizeManagedAcceptanceForStage("quality_gates", "Подтверждаю контракт"),
    "Подтверждаю контракт"
  );
});

test("stage-gated recogniser ignores acceptance phrases outside Type B stages", () => {
  assert.equal(
    recognizeManagedAcceptanceForStage("diagram_modules", "Принимаю контракт"),
    null
  );
  assert.equal(
    recognizeManagedAcceptanceForStage("description", "Принимаю контракт"),
    null
  );
  assert.equal(
    recognizeManagedAcceptanceForStage(null, "Принимаю контракт"),
    null
  );
  assert.equal(
    recognizeManagedAcceptanceForStage(undefined, "Принимаю контракт"),
    null
  );
});

const REVISION_PLAN_TEMPLATE = [
  "# Managed Workspace TODO Plan",
  "",
  "<!-- codeai-plan-state:start -->",
  "```json",
  "{",
  '  "schema": "codeai-plan-v1",',
  '  "executionScopeStatus": "ACTIVE",',
  '  "currentTaskId": "application-skeleton.phase2.review.task1",',
  '  "expectedCommitMessage": "(open-ended review)"',
  "}",
  "```",
  "<!-- codeai-plan-state:end -->",
  "",
  "## Phase 2 — Application Skeleton Contract Review",
  "",
  "### Stream: Phase 1B User-Led Review",
  "",
  "3. [TODO] `application-skeleton.phase2.review.task1` Open-ended review.",
  "",
].join("\n");

const REVISION1_TASK_RE =
  /application-skeleton\.phase2\.review\.revision1\.task1/u;
const REVISION2_TASK_RE =
  /application-skeleton\.phase2\.review\.revision2\.task1/u;
const REVISION1_CURRENT_TASK_JSON_RE =
  /"currentTaskId": "application-skeleton\.phase2\.review\.revision1\.task1"/u;
const REVISION1_COMMIT_MSG_JSON_RE =
  /"expectedCommitMessage": "docs: revise application skeleton contract — revision 1"/u;
const REVIEW_OPEN_TASK_RE = /application-skeleton\.phase2\.review\.task1/u;
const REVISION1_BACKTICKS_RE =
  /`application-skeleton\.phase2\.review\.revision1\.task1`/u;
const REVIEW_OPEN_BACKTICKS_RE =
  /`application-skeleton\.phase2\.review\.task1`/u;
const PLAN_REMOVAL_REVIEW_LINE_RE =
  /3\. \[TODO\] `application-skeleton\.phase2\.review\.task1` Open-ended review\./u;

test("revision injection helper inserts revision1 task pair before review.task1", () => {
  const result = injectApplicationSkeletonReviewRevisionPair(
    REVISION_PLAN_TEMPLATE
  );
  assert.ok(result, "Expected injection helper to return a non-null result");
  if (!result) {
    return;
  }
  assert.equal(
    result.nextCurrentTaskId,
    "application-skeleton.phase2.review.revision1.task1"
  );
  assert.equal(
    result.nextCommitMessage,
    "docs: revise application skeleton contract — revision 1"
  );
  assert.equal(result.nextRevisionNumber, 1);
  assert.match(result.nextPlanText, REVISION1_TASK_RE);
  assert.match(result.nextPlanText, REVISION1_CURRENT_TASK_JSON_RE);
  assert.match(result.nextPlanText, REVISION1_COMMIT_MSG_JSON_RE);
  // The open-ended review task line must remain in the plan after injection
  // so the subsequent post-commit advance returns currentTaskId to it.
  assert.match(result.nextPlanText, REVIEW_OPEN_TASK_RE);
  // Ordering: the revision task must appear textually before the open-ended
  // review task in the plan.
  const revisionIndex = result.nextPlanText.search(REVISION1_BACKTICKS_RE);
  const reviewIndex = result.nextPlanText.search(REVIEW_OPEN_BACKTICKS_RE);
  assert.ok(revisionIndex >= 0 && reviewIndex >= 0);
  assert.ok(revisionIndex < reviewIndex);
});

test("revision injection helper increments revision number on subsequent calls", () => {
  const first = injectApplicationSkeletonReviewRevisionPair(
    REVISION_PLAN_TEMPLATE
  );
  assert.ok(first);
  if (!first) {
    return;
  }
  // Simulate post-commit advance: currentTaskId returns to review.task1 in the
  // JSON state, but the revision1 task pair stays in the plan body.
  const planAfterAdvance = first.nextPlanText.replace(
    REVISION1_CURRENT_TASK_JSON_RE,
    '"currentTaskId": "application-skeleton.phase2.review.task1"'
  );
  const second = injectApplicationSkeletonReviewRevisionPair(planAfterAdvance);
  assert.ok(second);
  if (!second) {
    return;
  }
  assert.equal(second.nextRevisionNumber, 2);
  assert.match(second.nextPlanText, REVISION1_TASK_RE);
  assert.match(second.nextPlanText, REVISION2_TASK_RE);
});

test("revision injection helper returns null when review task is absent", () => {
  const planWithoutReview = REVISION_PLAN_TEMPLATE.replace(
    PLAN_REMOVAL_REVIEW_LINE_RE,
    ""
  );
  assert.equal(
    injectApplicationSkeletonReviewRevisionPair(planWithoutReview),
    null
  );
});

test("post-turn service does not dispatch via gateway without explicit handle() invocation", () => {
  const dispatched: Array<{
    readonly content: unknown;
    readonly sessionId: string;
  }> = [];
  // Constructing the service wires up the gateway but must not synchronously
  // dispatch a provider-visible message. Provider-visible corrections are
  // gated on an explicit handle() call originating from a terminal event,
  // not on read-model snapshots or constructor side-effects.
  const _service = new ManagedWorkflowPostTurnService({
    developmentTreeAgentSessions: {
      gateway: {
        createSessionForWorkflow: () => Promise.resolve(null),
        handleMessage: (sessionId, content) => {
          dispatched.push({ content, sessionId });
          return Promise.resolve();
        },
      },
      providerId: "codexCli",
    },
    logger: new Logger("error"),
  });
  assert.deepEqual(dispatched, []);
});

test("post-turn service replays a queued rerun after the current pass completes", async () => {
  const sessionId = "quality-gates-session";
  let callCount = 0;
  let releaseFirstPass: (() => void) | null = null;
  const service = new ManagedWorkflowPostTurnService({
    logger: new Logger("error"),
    sessionManager: {
      getSession: () => ({
        initiativeSlug: "demo-workspace",
        stage: "quality_gates",
        workspacePath: "/tmp/demo-workspace",
      }),
    } as unknown as SessionManager,
  });

  (
    service as unknown as {
      run: (params: {
        sessionId: string;
        stage: string;
        workspaceRoot: string;
        workspaceSlug: string;
      }) => Promise<void>;
    }
  ).run = async () => {
    callCount += 1;
    if (callCount === 1) {
      await new Promise<void>((resolve) => {
        releaseFirstPass = resolve;
      });
    }
  };

  service.handle(sessionId);
  service.handle(sessionId);
  assert.equal(callCount, 1);

  const release = releaseFirstPass as (() => void) | null;
  if (release === null) {
    throw new Error("Expected the first pass blocker to be registered.");
  }
  release();
  await service.whenIdle(sessionId);

  assert.equal(callCount, 2);
});

test("post-turn service does not mutate future stage plans during diagram modules arbitration", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-post-turn-stage-scope-")
  );
  const workspaceSlug = "demo-workspace";
  const sessionId = "diagram-session";
  try {
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "Test User"]);
    const installer = new ManagedPlanOrchestratorInstaller();
    await installer.install(workspaceRoot, {
      initialStage: "application_skeleton",
    });
    await installer.install(workspaceRoot, { initialStage: "diagram_modules" });
    const applicationSkeletonPlanPath = path.join(
      workspaceRoot,
      APPLICATION_SKELETON_PLAN_PATH
    );
    const applicationSkeletonPlanBefore = await readFile(
      applicationSkeletonPlanPath,
      "utf8"
    );
    await git(workspaceRoot, ["add", "."]);
    await git(workspaceRoot, ["commit", "-m", "baseline"]);

    const service = new ManagedWorkflowPostTurnService({
      logger: new Logger("error"),
      sessionManager: {
        getSession: () => ({
          initiativeSlug: workspaceSlug,
          stage: "diagram_modules",
          workspacePath: workspaceRoot,
        }),
      } as unknown as SessionManager,
    });

    service.handle(sessionId);
    await service.whenIdle(sessionId);

    assert.equal(
      await readFile(applicationSkeletonPlanPath, "utf8"),
      applicationSkeletonPlanBefore
    );
    assert.equal(await git(workspaceRoot, ["status", "--short"]), "");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

const git = async (cwd: string, args: readonly string[]): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], { cwd });
  return stdout.trim();
};

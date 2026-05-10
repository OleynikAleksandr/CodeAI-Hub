import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import { injectApplicationSkeletonReviewRevisionPair } from "./managed-documentation-commit-transaction";
import {
  ManagedWorkflowPostTurnService,
  recognizeManagedAcceptanceForStage,
  recognizeManagedContractAcceptancePhrase,
} from "./managed-workflow-post-turn-service";

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

test("recogniser rejects messages without contract noun", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Принимаю эту правку"),
    null
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Подтверждаю изменения"),
    null
  );
});

test("recogniser rejects negated acceptance verbs", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Не принимаю контракт"),
    null
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Не подтверждаю контракт пока"),
    null
  );
});

test("recogniser rejects empty and whitespace-only input", () => {
  assert.equal(recognizeManagedContractAcceptancePhrase(""), null);
  assert.equal(recognizeManagedContractAcceptancePhrase("   "), null);
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
  '  "currentTaskId": "application-skeleton.phase1b.review.task1",',
  '  "expectedCommitMessage": "(open-ended review)"',
  "}",
  "```",
  "<!-- codeai-plan-state:end -->",
  "",
  "## Phase 2 — Application Skeleton Contract Review",
  "",
  "### Stream: Phase 1B User-Led Review",
  "",
  "3. [TODO] `application-skeleton.phase1b.review.task1` Open-ended review.",
  "",
].join("\n");

const REVISION1_TASK_RE =
  /application-skeleton\.phase1b\.review\.revision1\.task1/u;
const REVISION2_TASK_RE =
  /application-skeleton\.phase1b\.review\.revision2\.task1/u;
const REVISION1_CURRENT_TASK_JSON_RE =
  /"currentTaskId": "application-skeleton\.phase1b\.review\.revision1\.task1"/u;
const REVISION1_COMMIT_MSG_JSON_RE =
  /"expectedCommitMessage": "docs: revise application skeleton contract — phase 1B revision 1"/u;
const REVIEW_OPEN_TASK_RE = /application-skeleton\.phase1b\.review\.task1/u;
const REVISION1_BACKTICKS_RE =
  /`application-skeleton\.phase1b\.review\.revision1\.task1`/u;
const REVIEW_OPEN_BACKTICKS_RE =
  /`application-skeleton\.phase1b\.review\.task1`/u;
const PLAN_REMOVAL_REVIEW_LINE_RE =
  /3\. \[TODO\] `application-skeleton\.phase1b\.review\.task1` Open-ended review\./u;

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
    "application-skeleton.phase1b.review.revision1.task1"
  );
  assert.equal(
    result.nextCommitMessage,
    "docs: revise application skeleton contract — phase 1B revision 1"
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
    '"currentTaskId": "application-skeleton.phase1b.review.task1"'
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

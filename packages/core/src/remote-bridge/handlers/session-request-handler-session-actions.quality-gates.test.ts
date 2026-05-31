import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ManagedWorkflowScaffoldInstaller } from "../../managed-workflow-orchestration/managed-workflow-scaffold-installer";
import { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { QualityGatesManagedValidationResult } from "../../managed-workflow-orchestration/quality-gates/quality-gates-validator";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import type { BridgeEvent } from "../types";
import { SessionRequestHandlerSessionActions } from "./session-request-handler-session-actions";

const WORKSPACE_SLUG = "demo-workspace";
const QUALITY_GATES_REVIEW_TASK_STATE_RE =
  /"currentTaskId": "quality-gates\.phase2\.review\.task1"/u;
const QUALITY_GATES_INTEGRATION_TASK_STATE_RE =
  /"currentTaskId": "quality-gates\.phase3\.integrate\.task1"/u;
const NO_REVISION_RE = /not-created-user-accepted-without-review-revision/u;
const QUALITY_GATES_INTEGRATION_PROMPT_RE =
  /Core opens Phase 3 Quality Gates Integration/u;
const QUALITY_GATES_REVIEW_CORRECTIONS_RE = /Quality Gates review corrections/u;
const SMOKE_GATE_RE = /smoke gate/u;
const USER_ACCEPTANCE_RE = /подтверждаю/u;

interface CapturedMessage {
  readonly content: unknown;
  readonly role?: string;
}

const createQualityGatesDraftDecision =
  (): QualityGatesManagedValidationResult => ({
    contractJson: {
      accepted: false,
      advisory: [],
      commands: {
        "qg-smoke": {
          command: "npm run qg:smoke",
          desiredStatus: "required",
          summary: "Smoke gate",
        },
      },
      deferred: [],
      integrated: false,
      integrationState: "not_started",
      requiredBeforeCommit: ["qg-smoke"],
      requiredBeforeModuleExecution: [],
      requiredBeforePush: [],
      requiredBeforeRelease: [],
      schema: "codeai-quality-gates-v1",
    },
    diagnostics: [],
    nextAction: "open_user_review",
    nextPrompt: "review",
    phase: "draft",
    valid: true,
  });

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const readWorkspaceFile = (
  workspaceRoot: string,
  relativePath: string
): Promise<string> => readFile(path.join(workspaceRoot, relativePath), "utf8");

const prepareQualityGatesReviewWorkspace = async (
  workspaceRoot: string
): Promise<void> => {
  await new ManagedWorkflowScaffoldInstaller().installDiagramModulesScaffold({
    workspaceRoot,
  });
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`,
    "# Quality Gates\n\nDraft contract.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`,
    `${JSON.stringify(createQualityGatesDraftDecision().contractJson, null, 2)}\n`
  );
  const controller = new QualityGatesStagePlanController();
  await controller.openDraftPhase({ workspaceRoot });
  const committed = await controller.commitManagedTurn({
    decision: createQualityGatesDraftDecision(),
    sessionId: "setup-session",
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  assert.equal(committed.blocked, null);
};

const createActions = (sessionManager: SessionManager) => {
  const dialogMessages: CapturedMessage[] = [];
  const dispatchedUserMessages: string[] = [];
  const events: BridgeEvent[] = [];
  const sentInternalMessages: string[] = [];
  const actions = new SessionRequestHandlerSessionActions({
    appliedTurnConfig: {} as never,
    broadcaster: (event: BridgeEvent) => {
      events.push(event);
    },
    continuityLockService: { getContext: () => null } as never,
    continuityRolloverOrchestrator: {} as never,
    eventMessages: {
      appendCoreMessage: () => undefined,
      appendDialogMessage: (_sessionId: string, message: CapturedMessage) => {
        dialogMessages.push(message);
      },
      extractMessageContentAndTurnOptions: (payload: unknown) =>
        typeof payload === "string" ? { content: payload } : null,
      waitForMessagePersistence: () => Promise.resolve(),
    } as never,
    logger: new Logger("error"),
    messageDispatch: {
      dispatchUserMessage: (options: { readonly content: string }) => {
        dispatchedUserMessages.push(options.content);
        return Promise.resolve();
      },
      sendInternalMessage: (_sessionId: string, content: string) => {
        sentInternalMessages.push(content);
        return Promise.resolve();
      },
    } as never,
    onProviderFailure: () => undefined,
    providerRegistry: {} as never,
    providerSessions: new Map(),
    resumeLifecycle: {
      clearPostTurnContextDecision: () => undefined,
      getSessionResumeLifecycleState: () => ({
        finalTurnCompleted: false,
        mode: "resume",
        terminalLockReason: null,
      }),
      hasPendingPostTurnContextDecision: () => false,
      updateSessionResumeLifecycleState: () => undefined,
    } as never,
    sessionManager,
    sessionStorage: {} as never,
    stopRebind: {
      ensureSessionReadyForSend: async () => true,
    } as never,
    workspaceRuntime: {
      notifyLockChanged: () => undefined,
    } as never,
  });
  return {
    actions,
    dialogMessages,
    dispatchedUserMessages,
    events,
    sentInternalMessages,
  };
};

test("Quality Gates review acceptance opens integration without forwarding user text", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "quality-gates-review-accept-")
  );
  try {
    await prepareQualityGatesReviewWorkspace(workspaceRoot);
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      { initiativeSlug: WORKSPACE_SLUG, stage: "quality_gates" }
    );
    const harness = createActions(sessionManager);
    const acceptance = "подтверждаю, но принимаю текущий контракт как есть";

    await harness.actions.handleMessage(session.id, acceptance);

    assert.equal(harness.dialogMessages.at(-1)?.role, "user");
    assert.equal(harness.dialogMessages.at(-1)?.content, acceptance);
    assert.deepEqual(harness.sentInternalMessages, []);
    assert.equal(harness.dispatchedUserMessages.length, 1);
    assert.match(
      harness.dispatchedUserMessages[0] ?? "",
      QUALITY_GATES_INTEGRATION_PROMPT_RE
    );
    assert.doesNotMatch(
      harness.dispatchedUserMessages[0] ?? "",
      USER_ACCEPTANCE_RE
    );

    const plan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/quality-gates/todo-plan.md"
    );
    assert.match(plan, QUALITY_GATES_INTEGRATION_TASK_STATE_RE);
    assert.match(plan, NO_REVISION_RE);
    assert.deepEqual(harness.events, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates review corrections stay in the active review task", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "quality-gates-review-revision-")
  );
  try {
    await prepareQualityGatesReviewWorkspace(workspaceRoot);
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      { initiativeSlug: WORKSPACE_SLUG, stage: "quality_gates" }
    );
    const harness = createActions(sessionManager);
    const feedback = "Добавь smoke gate.";

    await harness.actions.handleMessage(session.id, feedback);

    assert.equal(harness.dialogMessages.at(-1)?.content, feedback);
    assert.deepEqual(harness.sentInternalMessages, []);
    assert.equal(harness.dispatchedUserMessages.length, 1);
    assert.match(
      harness.dispatchedUserMessages[0] ?? "",
      QUALITY_GATES_REVIEW_CORRECTIONS_RE
    );
    assert.match(harness.dispatchedUserMessages[0] ?? "", SMOKE_GATE_RE);

    const plan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/quality-gates/todo-plan.md"
    );
    assert.match(plan, QUALITY_GATES_REVIEW_TASK_STATE_RE);
    assert.doesNotMatch(plan, QUALITY_GATES_INTEGRATION_TASK_STATE_RE);
    assert.deepEqual(harness.events, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

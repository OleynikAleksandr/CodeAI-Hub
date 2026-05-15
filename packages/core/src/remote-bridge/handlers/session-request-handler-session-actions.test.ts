import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ApplicationSkeletonStagePlanController } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller";
import type { ApplicationSkeletonManagedValidationResult } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-validator";
import { ManagedWorkflowScaffoldInstaller } from "../../managed-workflow-orchestration/managed-workflow-scaffold-installer";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import type { BridgeEvent } from "../types";
import { SessionRequestHandlerSessionActions } from "./session-request-handler-session-actions";

const WORKSPACE_SLUG = "demo-workspace";
const REVIEW_TASK_STATE_RE =
  /"currentTaskId": "application-skeleton\.phase2\.review\.task1"/u;
const MATERIALIZE_TASK_STATE_RE =
  /"currentTaskId": "application-skeleton\.phase3\.materialize\.task1"/u;
const NO_REVISION_RE = /not-created-user-accepted-without-review-revision/u;
const MATERIALIZATION_PROMPT_RE =
  /Core opens Phase 3 Application Skeleton Materialization/u;
const REVIEW_CORRECTIONS_RE = /review corrections/u;
const RUNTIME_MODULE_RE = /core runtime module/u;
const USER_ACCEPTANCE_RE = /подтверждаю/u;

interface CapturedMessage {
  readonly content: unknown;
  readonly role?: string;
  readonly tag?: string;
}

const createDraftDecision = (): ApplicationSkeletonManagedValidationResult => ({
  diagnostics: [],
  mapJson: {
    accepted: false,
    materialized: false,
    productParts: [
      {
        codePath: "product-parts/core-runtime",
        partId: "core-runtime",
      },
    ],
  },
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

const prepareReviewWorkspace = async (workspaceRoot: string): Promise<void> => {
  await new ManagedWorkflowScaffoldInstaller().installDiagramModulesScaffold({
    workspaceRoot,
  });
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`,
    "# Application Skeleton\n\n## Overview\n\nDraft contract.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`,
    `${JSON.stringify(createDraftDecision().mapJson, null, 2)}\n`
  );
  const controller = new ApplicationSkeletonStagePlanController();
  await controller.openDraftPhase({ workspaceRoot });
  const committed = await controller.commitManagedTurn({
    decision: createDraftDecision(),
    sessionId: "setup-session",
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  assert.equal(committed.blocked, null);
};

const createActions = (sessionManager: SessionManager) => {
  const coreMessages: CapturedMessage[] = [];
  const dialogMessages: CapturedMessage[] = [];
  const dispatchedUserMessages: string[] = [];
  const events: BridgeEvent[] = [];
  const sentInternalMessages: string[] = [];
  const actions = new SessionRequestHandlerSessionActions({
    appliedTurnConfig: {} as never,
    broadcaster: (event: BridgeEvent) => {
      events.push(event);
    },
    continuityLockService: {
      getContext: () => null,
    } as never,
    continuityRolloverOrchestrator: {} as never,
    eventMessages: {
      appendCoreMessage: (_sessionId: string, message: CapturedMessage) => {
        coreMessages.push(message);
      },
      appendDialogMessage: (_sessionId: string, message: CapturedMessage) => {
        dialogMessages.push(message);
      },
      extractMessageContentAndTurnOptions: (payload: unknown) =>
        typeof payload === "string" ? { content: payload } : null,
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
  });
  return {
    actions,
    coreMessages,
    dialogMessages,
    dispatchedUserMessages,
    events,
    sentInternalMessages,
  };
};

test("Application Skeleton review acceptance opens materialization without forwarding user text", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "application-skeleton-review-accept-")
  );
  try {
    await prepareReviewWorkspace(workspaceRoot);
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      { initiativeSlug: WORKSPACE_SLUG, stage: "application_skeleton" }
    );
    const harness = createActions(sessionManager);

    await harness.actions.handleMessage(session.id, "подтверждаю");

    assert.deepEqual(harness.dispatchedUserMessages, []);
    assert.equal(harness.dialogMessages.at(-1)?.role, "user");
    assert.equal(harness.dialogMessages.at(-1)?.content, "подтверждаю");
    assert.equal(harness.sentInternalMessages.length, 1);
    assert.match(
      harness.sentInternalMessages[0] ?? "",
      MATERIALIZATION_PROMPT_RE
    );
    assert.doesNotMatch(
      harness.sentInternalMessages[0] ?? "",
      USER_ACCEPTANCE_RE
    );
    assert.equal(
      harness.coreMessages.at(-1)?.tag,
      "managed-workflow-continuation"
    );

    const plan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md"
    );
    assert.match(plan, MATERIALIZE_TASK_STATE_RE);
    assert.match(plan, NO_REVISION_RE);
    assert.deepEqual(harness.events, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Application Skeleton review corrections stay in the active review task", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "application-skeleton-review-revision-")
  );
  try {
    await prepareReviewWorkspace(workspaceRoot);
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      { initiativeSlug: WORKSPACE_SLUG, stage: "application_skeleton" }
    );
    const harness = createActions(sessionManager);
    const feedback = "Переименуй runtime module в core runtime module.";

    await harness.actions.handleMessage(session.id, feedback);

    assert.deepEqual(harness.dispatchedUserMessages, []);
    assert.equal(harness.dialogMessages.at(-1)?.content, feedback);
    assert.equal(harness.sentInternalMessages.length, 1);
    assert.match(harness.sentInternalMessages[0] ?? "", REVIEW_CORRECTIONS_RE);
    assert.match(harness.sentInternalMessages[0] ?? "", RUNTIME_MODULE_RE);
    assert.equal(
      harness.coreMessages.at(-1)?.tag,
      "managed-workflow-user-review"
    );

    const plan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md"
    );
    assert.match(plan, REVIEW_TASK_STATE_RE);
    assert.doesNotMatch(plan, MATERIALIZE_TASK_STATE_RE);
    assert.deepEqual(harness.events, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

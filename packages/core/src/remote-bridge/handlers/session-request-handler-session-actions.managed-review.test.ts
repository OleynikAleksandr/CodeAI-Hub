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
const APPLICATION_MAP_PATH = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`;
const APPLICATION_MARKDOWN_PATH = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`;
const MANAGED_DECISION_PATH = `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/application_skeleton.json`;
const APPLICATION_STAGE_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
const MATERIALIZATION_REPAIR_PROMPT_RE =
  /Core rejected Application Skeleton materialization attempt 1/u;
const INVALID_PACKAGE_MANAGER_INSTALL_RE = /invalidpm install/u;
const DIAGNOSTICS_LABEL_RE = /Diagnostics:/u;
const APPLICATION_MATERIALIZATION_REPAIR_TASK_RE =
  /application-skeleton\.phase3\.repair\.task1/u;

const createActions = (sessionManager: SessionManager) => {
  const coreMessages: Array<{
    readonly content: unknown;
    readonly tag?: string;
  }> = [];
  const dialogMessages: Array<{
    readonly content: unknown;
    readonly role?: string;
  }> = [];
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
      appendCoreMessage: (
        _sessionId: string,
        message: { readonly content: unknown; readonly tag?: string }
      ) => {
        coreMessages.push(message);
      },
      appendDialogMessage: (
        _sessionId: string,
        message: { readonly content: unknown; readonly role?: string }
      ) => {
        dialogMessages.push(message);
      },
      extractMessageContentAndTurnOptions: (payload: unknown) => {
        if (typeof payload === "string") {
          return { content: payload };
        }
        if (!payload || typeof payload !== "object") {
          return null;
        }
        const typed = payload as {
          readonly content?: unknown;
          readonly turnOptions?: unknown;
        };
        return typeof typed.content === "string"
          ? {
              content: typed.content,
              turnOptions:
                typed.turnOptions &&
                typeof typed.turnOptions === "object" &&
                !Array.isArray(typed.turnOptions)
                  ? (typed.turnOptions as Record<string, unknown>)
                  : undefined,
            }
          : null;
      },
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
    stopRebind: { ensureSessionReadyForSend: async () => true } as never,
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

const createApplicationSkeletonDraftDecision =
  (): ApplicationSkeletonManagedValidationResult => ({
    diagnostics: [],
    mapJson: {
      accepted: false,
      materialized: false,
      packageManager: "invalidpm",
      productParts: [
        {
          codePath: "product-parts/surfaces",
          partId: "surfaces",
        },
      ],
      projectFoundation: {
        configFiles: [],
        firstWaveEntrypoints: [],
        requiredScripts: [],
      },
      sourceRoot: "product-parts",
    },
    nextAction: "open_user_review",
    nextPrompt: null,
    phase: "draft",
    valid: true,
  });

const prepareApplicationSkeletonReview = async (
  workspaceRoot: string
): Promise<void> => {
  await new ManagedWorkflowScaffoldInstaller().installDiagramModulesScaffold({
    workspaceRoot,
  });
  const controller = new ApplicationSkeletonStagePlanController();
  await controller.openDraftPhase({ workspaceRoot });
  const draftDecision = createApplicationSkeletonDraftDecision();
  await writeWorkspaceFile(
    workspaceRoot,
    APPLICATION_MARKDOWN_PATH,
    "# Application Skeleton\n\n## Overview\n\nDraft contract.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    APPLICATION_MAP_PATH,
    `${JSON.stringify(draftDecision.mapJson, null, 2)}\n`
  );
  await writeWorkspaceFile(
    workspaceRoot,
    MANAGED_DECISION_PATH,
    '{"stage":"application_skeleton","phase":"draft"}\n'
  );
  await controller.commitManagedTurn({
    decision: draftDecision,
    sessionId: "session-1",
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
};

test("managed review confirm action accepts the current gate without provider dispatch", async () => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codexCli",
    "/tmp/workspace",
    "provider-session-1",
    {
      stage: "description",
    }
  );
  const reviewMessage = sessionManager.appendMessage(
    session.id,
    "system",
    "Core: Description перешёл в пользовательскую проверку.\nНажмите кнопку «Подтверждаю» ниже.",
    { tag: "managed-workflow-user-review" }
  );
  const harness = createActions(sessionManager);

  await harness.actions.handleMessage(session.id, {
    content: "ignored visible label",
    turnOptions: {
      managedReviewAction: {
        reviewMessageId: reviewMessage?.id,
        type: "confirm",
      },
    },
  });

  assert.deepEqual(harness.dispatchedUserMessages, []);
  assert.equal(harness.dialogMessages.at(-1)?.role, "user");
  assert.equal(harness.dialogMessages.at(-1)?.content, "подтверждаю");
  assert.deepEqual(harness.events, []);
});

test("Application Skeleton review confirmation dispatches materialization repair after Core validation failure", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "application-skeleton-review-")
  );
  try {
    await prepareApplicationSkeletonReview(workspaceRoot);
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      {
        initiativeSlug: WORKSPACE_SLUG,
        stage: "application_skeleton",
      }
    );
    const reviewMessage = sessionManager.appendMessage(
      session.id,
      "system",
      "Application Skeleton перешёл в пользовательскую проверку.",
      { tag: "managed-workflow-user-review" }
    );
    const harness = createActions(sessionManager);

    await harness.actions.handleMessage(session.id, {
      content: "ignored visible label",
      turnOptions: {
        managedReviewAction: {
          reviewMessageId: reviewMessage?.id,
          type: "confirm",
        },
      },
    });

    const mapJson = JSON.parse(
      await readWorkspaceFile(workspaceRoot, APPLICATION_MAP_PATH)
    ) as Record<string, unknown>;
    const managedDecision = JSON.parse(
      await readWorkspaceFile(workspaceRoot, MANAGED_DECISION_PATH)
    ) as Record<string, unknown>;
    assert.deepEqual(harness.dispatchedUserMessages, []);
    assert.equal(harness.sentInternalMessages.length, 1);
    assert.match(
      harness.sentInternalMessages[0] ?? "",
      MATERIALIZATION_REPAIR_PROMPT_RE
    );
    assert.match(
      harness.sentInternalMessages[0] ?? "",
      INVALID_PACKAGE_MANAGER_INSTALL_RE
    );
    assert.equal(
      harness.coreMessages.at(-1)?.tag,
      "managed-workflow-validation"
    );
    assert.doesNotMatch(
      String(harness.coreMessages.at(-1)?.content),
      DIAGNOSTICS_LABEL_RE
    );
    assert.equal(mapJson.materialized, false);
    assert.equal(mapJson.materializationState, "failed");
    assert.equal(mapJson.reviewState, "accepted");
    assert.equal(managedDecision.valid, false);
    assert.equal(
      (managedDecision.mapJson as Record<string, unknown>).materialized,
      false
    );
    assert.match(
      await readWorkspaceFile(workspaceRoot, APPLICATION_STAGE_PLAN_PATH),
      APPLICATION_MATERIALIZATION_REPAIR_TASK_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("managed review confirm action rejects stale gates without provider dispatch", async () => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codexCli",
    "/tmp/workspace",
    "provider-session-1",
    {
      stage: "description",
    }
  );
  const staleReviewMessage = sessionManager.appendMessage(
    session.id,
    "system",
    "Core: Description перешёл в пользовательскую проверку.",
    { tag: "managed-workflow-user-review" }
  );
  sessionManager.appendMessage(session.id, "user", "later user text");
  const harness = createActions(sessionManager);

  await harness.actions.handleMessage(session.id, {
    content: "ignored visible label",
    turnOptions: {
      managedReviewAction: {
        reviewMessageId: staleReviewMessage?.id,
        type: "confirm",
      },
    },
  });

  assert.deepEqual(harness.dispatchedUserMessages, []);
  assert.deepEqual(harness.dialogMessages, []);
  assert.equal(eventsErrorCode(harness.events), "managed_review_gate_stale");
});

const eventsErrorCode = (events: readonly BridgeEvent[]): string | null => {
  const event = events.find((candidate) => candidate.type === "session:error");
  const payload = event?.payload;
  return typeof payload === "object" && payload !== null && "code" in payload
    ? String(payload.code)
    : null;
};

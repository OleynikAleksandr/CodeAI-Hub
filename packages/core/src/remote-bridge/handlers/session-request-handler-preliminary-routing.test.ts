import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import type { BridgeEvent } from "../types";
import { SessionRequestHandlerSessionActions } from "./session-request-handler-session-actions";

const WORKSPACE_SLUG = "demo-workspace";

interface CapturedMessage {
  readonly content: unknown;
  readonly role?: string;
  readonly tag?: string;
}

const createActions = (sessionManager: SessionManager) => {
  const coreMessages: CapturedMessage[] = [];
  const dialogMessages: CapturedMessage[] = [];
  const dispatchedUserMessages: string[] = [];
  const sentInternalMessages: string[] = [];
  const actions = new SessionRequestHandlerSessionActions({
    appliedTurnConfig: {} as never,
    broadcaster: (_event: BridgeEvent) => undefined,
    continuityLockService: { getContext: () => null } as never,
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
    stopRebind: { ensureSessionReadyForSend: async () => true } as never,
  });
  return {
    actions,
    coreMessages,
    dialogMessages,
    dispatchedUserMessages,
    sentInternalMessages,
  };
};

const assertPreliminaryPromptReachesProvider = async (params: {
  readonly prompt: string;
  readonly stage: "description" | "virtual_simulation";
}): Promise<void> => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), `${params.stage}-provider-direct-prompt-`)
  );
  try {
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      { initiativeSlug: WORKSPACE_SLUG, stage: params.stage }
    );
    const harness = createActions(sessionManager);

    await harness.actions.handleMessage(session.id, params.prompt);

    assert.deepEqual(harness.dispatchedUserMessages, [params.prompt]);
    assert.deepEqual(harness.coreMessages, []);
    assert.deepEqual(harness.dialogMessages, []);
    assert.deepEqual(harness.sentInternalMessages, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
};

test("preliminary Description prompt with confirmation instructions reaches provider", async () => {
  await assertPreliminaryPromptReachesProvider({
    prompt: "Create Final_Description.md. Later the user may type подтверждаю.",
    stage: "description",
  });
});

test("preliminary Virtual Simulation prompt with confirmation instructions reaches provider", async () => {
  await assertPreliminaryPromptReachesProvider({
    prompt:
      "Create virtual-simulation.md. Later the user may type подтверждаю.",
    stage: "virtual_simulation",
  });
});

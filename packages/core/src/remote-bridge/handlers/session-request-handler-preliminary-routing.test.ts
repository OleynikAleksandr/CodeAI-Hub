import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { sanitizeWorkspaceSlug } from "@codeai-hub/unified-session";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import type { BridgeEvent } from "../types";
import { SessionRequestHandlerSessionActions } from "./session-request-handler-session-actions";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const DESCRIPTION_COMPLETE_RE = /Core: Description завершён и зафиксирован/u;
const ACCEPTED_STEP_COMMIT_RE = /codeai-step: Description accepted/u;
const FINAL_DESCRIPTION_RE =
  /\.codeai-hub\/demo-workspace\/description\/Final_Description\.md/u;
const RUNTIME_SLICES_RE =
  /\.codeai-hub\/demo-workspace\/runtime-slices\/manifest\.json/u;
const TASK_TIMERS_RE = /\.codeai-hub\/state\/task-timers\.json/u;

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

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, { cwd: workspaceRoot });
  return stdout.trim();
};

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
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

const seedPreliminaryReviewGate = (params: {
  readonly sessionId: string;
  readonly sessionManager: SessionManager;
  readonly stageLabel: "Description" | "Virtual Simulation";
}): void => {
  params.sessionManager.appendMessage(
    params.sessionId,
    "system",
    [
      `Core: ${params.stageLabel} перешёл в пользовательскую проверку.`,
      "Пожалуйста, ответьте на вопросы агента, задайте свои вопросы или напишите правки.",
      "Если хотите принять текущий результат как есть и продолжить следующий управляемый шаг, нажмите кнопку «Подтверждаю» ниже.",
    ].join("\n"),
    { tag: "managed-workflow-user-review" }
  );
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

test("preliminary review accepts only explicit confirmation after Core gate", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "description-review-acceptance-")
  );
  const homeDirectory = await mkdtemp(
    path.join(tmpdir(), "description-review-home-")
  );
  const previousHome = process.env.HOME;
  try {
    process.env.HOME = homeDirectory;
    await writeText(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        WORKSPACE_SLUG,
        "description",
        "Final_Description.md"
      ),
      "# Final Description\n"
    );
    await writeText(
      path.join(workspaceRoot, ".codeai-hub", "state", "task-timers.json"),
      "{}\n"
    );
    await writeText(
      path.join(
        homeDirectory,
        ".codeai-hub",
        "sessions",
        sanitizeWorkspaceSlug(workspaceRoot),
        "codex",
        "description.jsonl"
      ),
      "session\n"
    );
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      { initiativeSlug: WORKSPACE_SLUG, stage: "description" }
    );
    seedPreliminaryReviewGate({
      sessionId: session.id,
      sessionManager,
      stageLabel: "Description",
    });
    const harness = createActions(sessionManager);

    await harness.actions.handleMessage(session.id, "подтверждаю");

    assert.deepEqual(harness.dispatchedUserMessages, []);
    assert.equal(harness.dialogMessages.at(-1)?.content, "подтверждаю");
    assert.equal(harness.coreMessages.at(-1)?.tag, "managed-workflow-complete");
    assert.match(
      String(harness.coreMessages.at(-1)?.content ?? ""),
      DESCRIPTION_COMPLETE_RE
    );
    assert.equal(await git(workspaceRoot, ["status", "--porcelain"]), "");
    assert.match(
      await git(workspaceRoot, ["log", "--oneline", "-1"]),
      ACCEPTED_STEP_COMMIT_RE
    );
    const trackedFiles = await git(workspaceRoot, ["ls-files"]);
    assert.match(trackedFiles, FINAL_DESCRIPTION_RE);
    assert.match(trackedFiles, RUNTIME_SLICES_RE);
    assert.doesNotMatch(trackedFiles, TASK_TIMERS_RE);
  } finally {
    if (previousHome === undefined) {
      process.env.HOME = undefined;
    } else {
      process.env.HOME = previousHome;
    }
    await rm(homeDirectory, { force: true, recursive: true });
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("preliminary review sends non-exact confirmation text to provider", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "description-review-feedback-")
  );
  try {
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      { initiativeSlug: WORKSPACE_SLUG, stage: "description" }
    );
    seedPreliminaryReviewGate({
      sessionId: session.id,
      sessionManager,
      stageLabel: "Description",
    });
    const harness = createActions(sessionManager);
    const feedback = "подтверждаю вопрос 1, но добавь поддержку Linux";

    await harness.actions.handleMessage(session.id, feedback);

    assert.deepEqual(harness.dispatchedUserMessages, [feedback]);
    assert.deepEqual(harness.coreMessages, []);
    assert.deepEqual(harness.dialogMessages, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

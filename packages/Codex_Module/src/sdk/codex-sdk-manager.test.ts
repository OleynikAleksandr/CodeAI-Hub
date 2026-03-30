import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { ActiveSession } from "../session/types";
import { CodexSDKManager } from "./codex-sdk-manager";

test("resumeSession keeps existing thread id for gpt-5.4 instead of starting a fresh thread", async () => {
  const resumedSessions: Array<{
    readonly workspacePath: string;
    readonly threadId: string;
  }> = [];
  const createdSessions: string[] = [];
  const initializedSessions: string[] = [];
  const fakeThread = { marker: "thread" };
  const fakeSession = createActiveSession("/tmp/codex-resume", "thread-123");

  const manager = new CodexSDKManager({
    installer: {
      ensureInstalled: async () => {
        // noop
      },
      loadModule: () => {
        throw new Error("loadModule should not be called in this test");
      },
    },
    authManager: {
      ensureAuthenticated: async () => {
        // noop
      },
    },
    sessions: {
      createSession: (workspacePath: string) => {
        createdSessions.push(workspacePath);
        return {
          tempId: "temp-created",
          session: createActiveSession(workspacePath, "temp-created"),
        };
      },
      createResumedSession: (workspacePath: string, threadId: string) => {
        resumedSessions.push({ workspacePath, threadId });
        return fakeSession;
      },
      getSession: () => fakeSession,
      closeSession: async () => {
        // noop
      },
    },
    processor: {
      initializeSession: (session: ActiveSession) => {
        initializedSessions.push(session.sessionId);
      },
    },
    workspace: {
      workspacePath: "/tmp/workspace-default",
      defaultModel: "gpt-5.4",
      defaultReasoningEffort: "medium",
      defaultSandboxMode: "workspace-write",
      skipGitRepoCheck: true,
    },
  } as never);

  (manager as unknown as { initialize: () => Promise<void> }).initialize =
    async () => {
      // noop
    };
  (manager as unknown as { createThread: () => unknown }).createThread = () =>
    fakeThread;

  const resumedId = await manager.resumeSession("thread-123");

  assert.equal(resumedId, "thread-123");
  assert.deepEqual(resumedSessions, [
    {
      workspacePath: "/tmp/workspace-default",
      threadId: "thread-123",
    },
  ]);
  assert.deepEqual(createdSessions, []);
  assert.deepEqual(initializedSessions, ["thread-123"]);
  assert.equal(fakeSession.thread, fakeThread as never);
});

const createActiveSession = (
  workspacePath: string,
  sessionId: string
): ActiveSession => ({
  sessionId,
  workspacePath,
  createdAt: Date.now(),
  eventEmitter: new EventEmitter(),
  messageController: {
    pendingMessages: [],
    resolveNext: null,
  },
  logger: null,
  codexThreadId: sessionId,
  internalTurn: false,
});

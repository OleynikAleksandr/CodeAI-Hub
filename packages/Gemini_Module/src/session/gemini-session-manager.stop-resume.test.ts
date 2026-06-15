import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type {
  GeminiCliModules,
  GeminiConversationRecord,
} from "../runtime/cli-types";
import type { CliArgs } from "../runtime/gemini-cli-compat";
import { GeminiSessionManager } from "./gemini-session-manager";

interface ResumeChatCall {
  readonly history: unknown;
  readonly resumedSessionData: {
    readonly conversation: GeminiConversationRecord;
    readonly filePath: string;
  };
}

interface StopResumeSpy {
  readonly convertHistoryCalls: Array<readonly unknown[]>;
  readonly loadCliConfigCalls: CliArgs[];
  resetChatCalls: number;
  readonly resumeChatCalls: ResumeChatCall[];
  readonly setSessionIdCalls: string[];
}

const createStopResumeModules = (
  providerSessionIds: string[],
  spy: StopResumeSpy,
  projectTempDir?: string
): GeminiCliModules => {
  const shiftProviderSessionId = (): string =>
    providerSessionIds.shift() ?? "provider-session-default";

  return {
    config: {
      loadCliConfig: (
        _mergedSettings: unknown,
        _sessionId: string,
        argv: CliArgs,
        _workspacePath: string
      ) => {
        spy.loadCliConfigCalls.push(argv);
        const providerSessionId = shiftProviderSessionId();
        let currentSessionId = providerSessionId;
        return Promise.resolve({
          refreshAuth: () => Promise.resolve(),
          setModel: (_model: string) => {
            // noop
          },
          setSessionId: (id: string) => {
            spy.setSessionIdCalls.push(id);
            currentSessionId = id;
          },
          initialize: () => Promise.resolve(),
          storage: projectTempDir
            ? { getProjectTempDir: () => projectTempDir }
            : undefined,
          getGeminiClient: () => ({
            resetChat: () => {
              spy.resetChatCalls += 1;
              return Promise.resolve();
            },
            resumeChat: (
              history: unknown,
              resumedSessionData: ResumeChatCall["resumedSessionData"]
            ) => {
              spy.resumeChatCalls.push({ history, resumedSessionData });
              return Promise.resolve();
            },
          }),
          getModel: () => "gemini-2.5-pro",
          getSessionId: () => currentSessionId,
        });
      },
    },
    settings: {
      loadSettings: () => ({
        merged: {
          security: {
            auth: {
              selectedType: "login_with_google",
            },
          },
        },
      }),
      migrateDeprecatedSettings: () => {
        // noop
      },
    },
    contentGenerator: {
      AuthType: {
        LOGIN_WITH_GOOGLE: "login_with_google",
        USE_GEMINI: "use_gemini",
        USE_VERTEX_AI: "use_vertex_ai",
        LEGACY_CLOUD_SHELL: "legacy_cloud_shell",
      },
    },
    sessionUtils: {
      convertSessionToClientHistory: (
        messages: readonly { readonly type: string }[]
      ) => {
        spy.convertHistoryCalls.push(messages);
        return messages.map((msg) => ({
          role: msg.type === "user" ? "user" : "model",
          parts: [{ text: "stub" }],
        }));
      },
    },
    toolScheduler: {
      CoreToolScheduler: class {
        async schedule(): Promise<void> {
          return await Promise.resolve();
        }
      },
    },
    turn: {
      GeminiEventType: {
        Content: "content",
        Finished: "finished",
        Thought: "thought",
        ToolCallRequest: "tool_call_request",
      },
    },
  } as unknown as GeminiCliModules;
};

const createSpy = (): StopResumeSpy => ({
  loadCliConfigCalls: [],
  resetChatCalls: 0,
  resumeChatCalls: [],
  setSessionIdCalls: [],
  convertHistoryCalls: [],
});

test("GeminiSessionManager.closeSession does not reset provider chat history", async () => {
  const spy = createSpy();
  const manager = new GeminiSessionManager(
    createStopResumeModules(["provider-123"], spy)
  );

  const result = await manager.createSession({
    workspacePath: "/tmp/stop-resume",
  });
  assert.equal(result.sessionId, "provider-123");
  result.session.eventEmitter.on("message", () => {
    // noop
  });
  result.session.eventEmitter.on("error", () => {
    // noop
  });
  assert.equal(result.session.eventEmitter.listenerCount("message"), 1);
  assert.equal(result.session.eventEmitter.listenerCount("error"), 1);

  manager.closeSession("provider-123");

  assert.equal(
    spy.resetChatCalls,
    0,
    "closeSession must not call client.resetChat() on Stop"
  );
  assert.equal(result.session.eventEmitter.listenerCount("message"), 0);
  assert.equal(result.session.eventEmitter.listenerCount("error"), 0);
  assert.equal(manager.listSessions().length, 0);
});

test("GeminiSessionManager.resumeSession forwards pre-stop providerSessionId through argv.resume", async () => {
  const spy = createSpy();
  const manager = new GeminiSessionManager(
    createStopResumeModules(["provider-aaa", "provider-aaa"], spy)
  );

  await manager.createSession({ workspacePath: "/tmp/stop-resume" });
  manager.closeSession("provider-aaa");

  await manager.resumeSession("provider-aaa", {
    workspacePath: "/tmp/stop-resume",
  });

  assert.equal(spy.loadCliConfigCalls.length, 2);
  const [firstCallArgv, secondCallArgv] = spy.loadCliConfigCalls;
  assert.equal(
    (firstCallArgv as unknown as { readonly resume?: string }).resume,
    undefined,
    "initial createSession must not set argv.resume"
  );
  assert.equal(
    (secondCallArgv as unknown as { readonly resume?: string }).resume,
    "provider-aaa",
    "resumeSession must forward pre-stop providerSessionId as argv.resume"
  );
});

test("GeminiSessionManager.resumeSession hydrates chat via client.resumeChat using persisted chat file", async () => {
  const spy = createSpy();
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "gemini-resume-test-")
  );
  const chatsDir = path.join(tempDir, "chats");
  await fs.mkdir(chatsDir, { recursive: true });

  const providerSessionId = "abcdef12-1111-2222-3333-4444556677ab";
  const bigConversation: GeminiConversationRecord = {
    sessionId: providerSessionId,
    messages: [
      { type: "user", content: [{ text: "Initial instruction" }] },
      { type: "gemini", content: [{ text: "Ack" }] },
      { type: "user", content: [{ text: "Follow-up" }] },
    ],
  };
  await fs.writeFile(
    path.join(
      chatsDir,
      `session-2026-04-17T10-00-${providerSessionId.slice(0, 8)}.json`
    ),
    JSON.stringify(bigConversation),
    "utf8"
  );
  // Stale duplicate with same UUID prefix but fewer messages — must be ignored.
  const staleConversation: GeminiConversationRecord = {
    sessionId: providerSessionId,
    messages: [{ type: "user", content: [{ text: "only-продолжай" }] }],
  };
  await fs.writeFile(
    path.join(
      chatsDir,
      `session-2026-04-17T10-08-${providerSessionId.slice(0, 8)}.json`
    ),
    JSON.stringify(staleConversation),
    "utf8"
  );

  const manager = new GeminiSessionManager(
    createStopResumeModules([providerSessionId], spy, tempDir)
  );

  try {
    await manager.resumeSession(providerSessionId, {
      workspacePath: "/tmp/resume-hydrate",
    });

    assert.equal(
      spy.resumeChatCalls.length,
      1,
      "client.resumeChat must be invoked once during resume bootstrap"
    );
    const [call] = spy.resumeChatCalls;
    assert.equal(
      call.resumedSessionData.conversation.sessionId,
      providerSessionId
    );
    assert.equal(
      call.resumedSessionData.conversation.messages.length,
      3,
      "resume must pick the chat file with the most messages (not the stale duplicate)"
    );
    assert.equal(
      spy.setSessionIdCalls.at(-1),
      providerSessionId,
      "config.setSessionId must be called with the loaded sessionId"
    );
    assert.equal(spy.convertHistoryCalls.length, 1);
    assert.equal(
      (spy.convertHistoryCalls[0] as unknown[]).length,
      3,
      "convertSessionToClientHistory receives the full message list"
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("GeminiSessionManager.resumeSession degrades gracefully when chat file is missing", async () => {
  const spy = createSpy();
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "gemini-resume-missing-")
  );
  const chatsDir = path.join(tempDir, "chats");
  await fs.mkdir(chatsDir, { recursive: true });

  const providerSessionId = "deadbeef-aaaa-bbbb-cccc-dddddddddddd";
  const manager = new GeminiSessionManager(
    createStopResumeModules([providerSessionId], spy, tempDir)
  );

  try {
    await manager.resumeSession(providerSessionId, {
      workspacePath: "/tmp/resume-missing",
    });

    assert.equal(
      spy.resumeChatCalls.length,
      0,
      "resumeChat must not be called when no matching chat file exists"
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

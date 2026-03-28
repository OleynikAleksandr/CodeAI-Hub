import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { SessionCreationOptions } from "../session/types";
import { GeminiProviderAdapter } from "./gemini-provider-adapter";

const EMPTY_RESUME_SESSION_ID_ERROR_RE =
  /Cannot resume Gemini session with an empty session id/;

interface ResumeCall {
  readonly options: Omit<SessionCreationOptions, "resumeSessionId">;
  readonly sessionId: string;
}

const createAdapterHarness = () => {
  const resumeCalls: ResumeCall[] = [];
  const sendCalls: Array<{ sessionId: string; content: string }> = [];
  const eventEmitter = new EventEmitter();

  const manager = {
    createSession: () =>
      Promise.reject(
        new Error("createSession should not be called in this test")
      ),
    resumeSession: (
      sessionId: string,
      options: Omit<SessionCreationOptions, "resumeSessionId">
    ) => {
      resumeCalls.push({ sessionId, options });
      return Promise.resolve({
        sessionId: "provider-resumed-777",
        session: {
          eventEmitter,
        },
      });
    },
    closeSession: () => Promise.resolve(),
    sendMessage: (sessionId: string, content: string) => {
      sendCalls.push({ sessionId, content });
      return Promise.resolve();
    },
  };

  const adapter = new GeminiProviderAdapter({
    installerPaths: {
      macOS: "/tmp",
      linux: "/tmp",
      windows: "C:/tmp",
    },
    workspace: {
      workspacePath: "/fallback/workspace",
      defaultModel: "gemini-2.5-pro",
      thinkingLevelByModel: {
        "gemini-2.5-pro": "high",
      },
      settingsPath: "/tmp/settings.json",
    },
  });

  (
    adapter as unknown as {
      sessionManager: typeof manager;
    }
  ).sessionManager = manager;

  return { adapter, eventEmitter, manager, resumeCalls, sendCalls };
};

test("GeminiProviderAdapter resumeSession delegates to manager and wires events", async () => {
  const { adapter, eventEmitter, resumeCalls } = createAdapterHarness();

  const resumedSessionId = await adapter.resumeSession(
    "resume-id-42",
    "/workspace/path"
  );

  assert.equal(resumedSessionId, "provider-resumed-777");
  assert.equal(resumeCalls.length, 1);
  assert.equal(resumeCalls[0]?.sessionId, "resume-id-42");
  assert.equal(resumeCalls[0]?.options.workspacePath, "/workspace/path");
  assert.equal(resumeCalls[0]?.options.defaultModel, "gemini-2.5-pro");
  assert.equal(resumeCalls[0]?.options.thinkingLevel, "high");

  let observedPayload: unknown = null;
  const unsubscribe = adapter.subscribe(
    "provider-resumed-777",
    (eventPayload) => {
      observedPayload = eventPayload;
    }
  );

  const payload = { type: "assistant", content: "ok" };
  eventEmitter.emit("message", payload);

  assert.deepEqual(observedPayload, payload);
  unsubscribe();
});

test("GeminiProviderAdapter resumeSession rejects empty session id", async () => {
  const { adapter } = createAdapterHarness();

  await assert.rejects(
    async () => {
      await adapter.resumeSession("   ", "/workspace/path");
    },
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.match((error as Error).message, EMPTY_RESUME_SESSION_ID_ERROR_RE);
      return true;
    }
  );
});

test("GeminiProviderAdapter applies shared runtime overrides before send", async () => {
  const { adapter, manager, sendCalls } = createAdapterHarness();

  await adapter.sendMessage("runtime-session", "switch model", {
    __codeaiAppliedTurnConfig: {
      providerId: "geminiCli",
      modelId: "gemini-3-pro",
      thinkingLevel: "high",
      source: "settings_snapshot",
    },
  });

  assert.deepEqual(sendCalls, [
    {
      sessionId: "runtime-session",
      content: "switch model",
    },
  ]);
  assert.equal(
    (manager as unknown as { pendingModelOverride?: string })
      .pendingModelOverride,
    "gemini-3-pro"
  );
  assert.equal(
    (manager as unknown as { pendingThinkingLevelOverride?: string })
      .pendingThinkingLevelOverride,
    "high"
  );
});

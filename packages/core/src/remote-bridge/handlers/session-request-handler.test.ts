import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readAppliedProviderTurnConfig } from "../types";
import {
  createDescriptionSession,
  stubDescriptionDialogSync,
} from "./session-request-handler.test-continuity-helpers";
import {
  collectTurnStateSequence,
  createHarness,
  noop,
} from "./session-request-handler.test-helpers";

export {
  createDescriptionSession,
  emitProviderEvent,
  registerBootstrapLock,
  setLifecycle,
  stubDescriptionDialogSync,
  useProductionFlowNodeHandler,
} from "./session-request-handler.test-continuity-helpers";
export {
  type BindingUpdate,
  collectTurnStateSequence,
  countContextCheckPendingLockEvents,
  countContinuityUnlocks,
  countIdleTurnStateEvents,
  countNoRolloverUnlockEvents,
  createHarness,
  EXPECTED_HANDLER_SOURCE_INVARIANT_CHECKS,
  flushAsyncWork,
  getHandlerSourceInvariantChecks,
  type HandlerHarness,
  type HandlerTestInternals,
  internals,
  noop,
  type RuntimeLockUpdate,
  SOURCE_PATH,
} from "./session-request-handler.test-helpers";

test("SessionRequestHandler stop invalidates provider binding without deleting logical session", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "geminiCli",
    "/tmp/core-stop-invalidates-binding",
    "provider-session-before-stop"
  );
  const closeCalls: string[] = [];
  harness.providerSessions.set(session.id, {
    providerId: "geminiCli",
    providerSessionId: "provider-session-before-stop",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    closeSession: (providerSessionId: string) => {
      closeCalls.push(providerSessionId);
      return Promise.resolve();
    },
  });

  await harness.handler.handleStop(session.id);

  const updatedSession = harness.sessionManager.getSession(session.id);
  assert.ok(updatedSession);
  assert.equal(updatedSession?.providerSessionId, undefined);
  assert.equal(updatedSession?.providerSessionStatus, "pending");
  assert.equal(
    harness.sessionManager.hasStopInvalidatedBinding(session.id),
    true
  );
  assert.equal(harness.providerSessions.has(session.id), false);
  assert.deepEqual(closeCalls, ["provider-session-before-stop"]);
  assert.deepEqual(collectTurnStateSequence(harness.events), ["idle"]);
  assert.equal(
    harness.events.some((event) => {
      if (event.type !== "session:deleted") {
        return false;
      }
      const payload = event.payload as { readonly sessionId?: string };
      return payload.sessionId === session.id;
    }),
    false
  );
});

test("SessionRequestHandler rebinds stop-invalidated sessions on the next send", async () => {
  const harness = createHarness();
  const session = createDescriptionSession(
    harness,
    "/tmp/core-stop-rebind-send",
    "provider-session-before-stop",
    "geminiCli"
  );
  const closeCalls: string[] = [];
  const createCalls: string[] = [];
  const subscribeCalls: string[] = [];
  const sendCalls: Array<{
    readonly content: string;
    readonly providerSessionId: string;
  }> = [];
  stubDescriptionDialogSync(harness);
  harness.providerSessions.set(session.id, {
    providerId: "geminiCli",
    providerSessionId: "provider-session-before-stop",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    closeSession: (providerSessionId: string) => {
      closeCalls.push(providerSessionId);
      return Promise.resolve();
    },
    createSession: (workspacePath: string) => {
      createCalls.push(workspacePath);
      return Promise.resolve("provider-session-after-stop");
    },
    subscribe: (providerSessionId: string) => {
      subscribeCalls.push(providerSessionId);
      return noop;
    },
    sendMessage: (providerSessionId: string, content: string) => {
      sendCalls.push({ providerSessionId, content });
      return Promise.resolve();
    },
  });

  await harness.handler.handleStop(session.id);
  await harness.handler.handleMessage(session.id, "resume after stop");

  const updatedSession = harness.sessionManager.getSession(session.id);
  assert.equal(
    updatedSession?.providerSessionId,
    "provider-session-after-stop"
  );
  assert.equal(updatedSession?.providerSessionStatus, "ready");
  assert.equal(
    harness.sessionManager.hasStopInvalidatedBinding(session.id),
    false
  );
  assert.deepEqual(closeCalls, ["provider-session-before-stop"]);
  assert.deepEqual(createCalls, ["/tmp/core-stop-rebind-send"]);
  assert.deepEqual(subscribeCalls, ["provider-session-after-stop"]);
  assert.deepEqual(sendCalls, [
    {
      providerSessionId: "provider-session-after-stop",
      content: "resume after stop",
    },
  ]);
  assert.deepEqual(harness.continuityUpdates, [
    {
      sessionId: session.id,
      providerSessionId: "provider-session-after-stop",
    },
  ]);
  assert.equal(
    harness.events.some((event) => {
      if (event.type !== "session:error") {
        return false;
      }
      const payload = event.payload as { readonly code?: string };
      return payload.code === "missing_provider_binding";
    }),
    false
  );
});

test("SessionRequestHandler emits model update from applied turn config on outbound send", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/core-runtime-model-update"
  );
  harness.providerRegistry.getAdapter = () => ({
    sendMessage: async () => Promise.resolve(),
  });
  harness.providerSessions.set(session.id, {
    providerId: "codexCli",
    providerSessionId: "provider-session-5",
    unsubscribe: noop,
  });

  await harness.handler.handleMessage(session.id, "switch on next turn");

  const modelUpdate = harness.events.find(
    (event) => event.type === "session:model:update"
  );
  assert.deepEqual(modelUpdate, {
    type: "session:model:update",
    payload: {
      baseModelId: "gpt-5.3-codex",
      sessionId: session.id,
      providerId: "codexCli",
      modelId: "gpt-5.3-codex reasoning:medium",
    },
  });
});

test("SessionRequestHandler applies Claude model from live settings snapshot on outbound send", async () => {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "codeai-hub-claude-model-sync-")
  );
  const sharedSettingsPath = path.join(tempDir, "settings.json");

  try {
    await writeFile(
      sharedSettingsPath,
      `${JSON.stringify(
        {
          providers: {
            claude: {
              defaultModel: "sonnet",
            },
          },
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const harness = createHarness({
      claudeSettingsPath: path.join(tempDir, "claude.json"),
      claudeDefaultModel: "opus",
    });
    const sentTurnOptions: Array<Record<string, unknown> | undefined> = [];
    const session = harness.sessionManager.createSession(
      "claudeCodeCli",
      "/tmp/claude-runtime-model-update"
    );

    harness.providerRegistry.getAdapter = () => ({
      sendMessage: (
        _providerSessionId: string,
        _content: string,
        turnOptions?: Record<string, unknown>
      ) => {
        sentTurnOptions.push(turnOptions);
        return Promise.resolve();
      },
    });
    harness.providerSessions.set(session.id, {
      providerId: "claudeCodeCli",
      providerSessionId: "provider-session-claude",
      unsubscribe: noop,
    });

    await harness.handler.handleMessage(session.id, "start on sonnet");

    assert.deepEqual(readAppliedProviderTurnConfig(sentTurnOptions[0]), {
      baseModelId: "sonnet",
      effectiveModelId: "sonnet thinking:off",
      messagesForTheUserLanguage: "en",
      providerId: "claudeCodeCli",
      modelId: "sonnet",
      source: "settings_snapshot",
      reasoningEffort: undefined,
      thinkingEnabled: false,
      thinkingDisplaySyncEnabled: true,
      thinkingLevel: undefined,
    });

    const modelUpdate = harness.events.find(
      (event) => event.type === "session:model:update"
    );
    assert.deepEqual(modelUpdate, {
      type: "session:model:update",
      payload: {
        baseModelId: "sonnet",
        sessionId: session.id,
        providerId: "claudeCodeCli",
        modelId: "sonnet thinking:off",
      },
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("SessionRequestHandler threads Claude reasoning effort and display sync from settings snapshot", async () => {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "codeai-hub-claude-effort-sync-")
  );
  const sharedSettingsPath = path.join(tempDir, "settings.json");

  try {
    await writeFile(
      sharedSettingsPath,
      `${JSON.stringify(
        {
          providers: {
            claude: {
              defaultModel: "sonnet",
              thinking: {
                enabled: true,
                effort: "max",
              },
              thinkingDisplaySyncEnabled: false,
            },
          },
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const harness = createHarness({
      claudeSettingsPath: path.join(tempDir, "claude.json"),
      claudeDefaultModel: "opus",
    });
    const sentTurnOptions: Array<Record<string, unknown> | undefined> = [];
    const session = harness.sessionManager.createSession(
      "claudeCodeCli",
      "/tmp/claude-runtime-effort-update"
    );

    harness.providerRegistry.getAdapter = () => ({
      sendMessage: (
        _providerSessionId: string,
        _content: string,
        turnOptions?: Record<string, unknown>
      ) => {
        sentTurnOptions.push(turnOptions);
        return Promise.resolve();
      },
    });
    harness.providerSessions.set(session.id, {
      providerId: "claudeCodeCli",
      providerSessionId: "provider-session-claude-effort",
      unsubscribe: noop,
    });

    await harness.handler.handleMessage(session.id, "use max effort");

    assert.deepEqual(readAppliedProviderTurnConfig(sentTurnOptions[0]), {
      baseModelId: "sonnet",
      effectiveModelId: "sonnet reasoning:max",
      messagesForTheUserLanguage: "en",
      providerId: "claudeCodeCli",
      modelId: "sonnet",
      source: "settings_snapshot",
      reasoningEffort: "max",
      thinkingEnabled: true,
      thinkingDisplaySyncEnabled: false,
      thinkingLevel: undefined,
    });

    const modelUpdate = harness.events.find(
      (event) => event.type === "session:model:update"
    );
    assert.deepEqual(modelUpdate, {
      type: "session:model:update",
      payload: {
        baseModelId: "sonnet",
        sessionId: session.id,
        providerId: "claudeCodeCli",
        modelId: "sonnet reasoning:max",
      },
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("SessionRequestHandler applies localized user-message language from live settings snapshot", async () => {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "codeai-hub-gemini-language-sync-")
  );
  const sharedSettingsPath = path.join(tempDir, "settings.json");

  try {
    await writeFile(
      sharedSettingsPath,
      `${JSON.stringify(
        {
          general: {
            localization: {
              defaultLanguage: "en",
              categories: {
                messagesForTheUser: "ru",
              },
            },
          },
          providers: {
            gemini: {
              defaultModel: "gemini-3-pro-preview",
            },
          },
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const harness = createHarness({
      claudeSettingsPath: path.join(tempDir, "claude.json"),
      geminiDefaultModel: "gemini-3-pro-preview",
    });
    const sentTurnOptions: Array<Record<string, unknown> | undefined> = [];
    const session = harness.sessionManager.createSession(
      "geminiCli",
      "/tmp/gemini-runtime-language-update"
    );

    harness.providerRegistry.getAdapter = () => ({
      sendMessage: (
        _providerSessionId: string,
        _content: string,
        turnOptions?: Record<string, unknown>
      ) => {
        sentTurnOptions.push(turnOptions);
        return Promise.resolve();
      },
    });
    harness.providerSessions.set(session.id, {
      providerId: "geminiCli",
      providerSessionId: "provider-session-gemini",
      unsubscribe: noop,
    });

    await harness.handler.handleMessage(session.id, "проверь локализацию");

    assert.equal(
      readAppliedProviderTurnConfig(sentTurnOptions[0])
        ?.messagesForTheUserLanguage,
      "ru"
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

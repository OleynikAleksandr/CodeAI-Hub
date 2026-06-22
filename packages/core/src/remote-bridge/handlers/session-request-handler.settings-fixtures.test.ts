import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { providerSettingsSnapshotCache } from "../../config/json-file-snapshot-cache";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { readAppliedProviderTurnConfig } from "../types";
import { createHarness, noop } from "./session-request-handler.test-helpers";

const DEFAULT_GLOBAL_GENERAL_SETTINGS = {
  localization: {
    defaultLanguage: "en",
    categories: {
      messagesForTheUser: "en",
      reasoning: "en",
      systemFeedback: "en",
    },
    uiEngineId: "google-gtx",
    reasoningEngineId: "google-gtx",
  },
} as const;

const writeJsonSnapshot = async (
  filePath: string,
  snapshot: unknown
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  providerSettingsSnapshotCache.clear(filePath);
};

const setGlobalSettingsPathForTest = (settingsPath: string): (() => void) => {
  const original = process.env.CODEAI_GLOBAL_SETTINGS_PATH;
  process.env.CODEAI_GLOBAL_SETTINGS_PATH = settingsPath;
  return () => {
    if (original === undefined) {
      process.env.CODEAI_GLOBAL_SETTINGS_PATH = undefined;
      return;
    }
    process.env.CODEAI_GLOBAL_SETTINGS_PATH = original;
  };
};

const prepareSettingsFixture = async (
  tempDir: string,
  workspaceSlug: string,
  settings: Record<string, unknown>
): Promise<{
  readonly config: {
    readonly claudeProjectSlug: string;
    readonly claudeWorkspacePath: string;
    readonly globalSettingsPath: string;
  };
  readonly restoreGlobalSettingsPath: () => void;
}> => {
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: tempDir,
    workspaceSlug,
  });
  const globalSettingsPath = path.join(tempDir, "global-settings.json");
  const general =
    typeof settings.general === "object" &&
    settings.general !== null &&
    !Array.isArray(settings.general)
      ? settings.general
      : DEFAULT_GLOBAL_GENERAL_SETTINGS;

  await writeJsonSnapshot(capsule.settingsFile.absolutePath, settings);
  await writeJsonSnapshot(globalSettingsPath, { general });

  return {
    config: {
      claudeProjectSlug: workspaceSlug,
      claudeWorkspacePath: tempDir,
      globalSettingsPath,
    },
    restoreGlobalSettingsPath: setGlobalSettingsPathForTest(globalSettingsPath),
  };
};

test("SessionRequestHandler emits model update from applied turn config on outbound send", async () => {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "codeai-hub-codex-model-sync-")
  );
  let restoreGlobalSettingsPath: (() => void) | undefined;

  try {
    const fixture = await prepareSettingsFixture(
      tempDir,
      "core-runtime-model-update",
      {
        providers: {
          codex: {
            defaultModel: "gpt-5.4-mini",
            reasoningByModel: {
              "gpt-5.4-mini": "medium",
            },
          },
        },
      }
    );
    restoreGlobalSettingsPath = fixture.restoreGlobalSettingsPath;
    const harness = createHarness(fixture.config);
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
    assert.deepEqual(JSON.parse(JSON.stringify(modelUpdate)), {
      type: "session:model:update",
      payload: {
        baseModelId: "gpt-5.4-mini",
        sessionId: session.id,
        providerId: "codexCli",
        modelId: "gpt-5.4-mini reasoning:medium",
      },
    });
  } finally {
    restoreGlobalSettingsPath?.();
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("SessionRequestHandler applies Claude model from live settings snapshot on outbound send", async () => {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "codeai-hub-claude-model-sync-")
  );
  let restoreGlobalSettingsPath: (() => void) | undefined;

  try {
    const fixture = await prepareSettingsFixture(
      tempDir,
      "claude-runtime-model-update",
      {
        providers: {
          claude: {
            defaultModel: "sonnet",
          },
        },
      }
    );
    restoreGlobalSettingsPath = fixture.restoreGlobalSettingsPath;

    const harness = createHarness({
      ...fixture.config,
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
      artifactsForTheUserLanguage: "en",
      baseModelId: "sonnet",
      effectiveModelId: "sonnet thinking:off",
      messagesForTheUserLanguage: "en",
      providerId: "claudeCodeCli",
      modelId: "sonnet",
      source: "settings_snapshot",
      reasoningEffort: undefined,
      reasoningEngineId: "google-gtx",
      reasoningLanguage: "en",
      thinkingEnabled: false,
      thinkingDisplaySyncEnabled: true,
      thinkingLevel: undefined,
      translationEngineId: "google-gtx",
    });

    const modelUpdate = harness.events.find(
      (event) => event.type === "session:model:update"
    );
    assert.deepEqual(JSON.parse(JSON.stringify(modelUpdate)), {
      type: "session:model:update",
      payload: {
        baseModelId: "sonnet",
        sessionId: session.id,
        providerId: "claudeCodeCli",
        modelId: "sonnet thinking:off",
      },
    });
  } finally {
    restoreGlobalSettingsPath?.();
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("SessionRequestHandler threads Claude reasoning effort and display sync from settings snapshot", async () => {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "codeai-hub-claude-effort-sync-")
  );
  let restoreGlobalSettingsPath: (() => void) | undefined;

  try {
    const fixture = await prepareSettingsFixture(
      tempDir,
      "claude-runtime-effort-update",
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
      }
    );
    restoreGlobalSettingsPath = fixture.restoreGlobalSettingsPath;

    const harness = createHarness({
      ...fixture.config,
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
      artifactsForTheUserLanguage: "en",
      baseModelId: "sonnet",
      effectiveModelId: "sonnet reasoning:max",
      messagesForTheUserLanguage: "en",
      providerId: "claudeCodeCli",
      modelId: "sonnet",
      source: "settings_snapshot",
      reasoningEffort: "max",
      reasoningEngineId: "google-gtx",
      reasoningLanguage: "en",
      thinkingEnabled: true,
      thinkingDisplaySyncEnabled: false,
      thinkingLevel: undefined,
      translationEngineId: "google-gtx",
    });

    const modelUpdate = harness.events.find(
      (event) => event.type === "session:model:update"
    );
    assert.deepEqual(JSON.parse(JSON.stringify(modelUpdate)), {
      type: "session:model:update",
      payload: {
        baseModelId: "sonnet",
        sessionId: session.id,
        providerId: "claudeCodeCli",
        modelId: "sonnet reasoning:max",
      },
    });
  } finally {
    restoreGlobalSettingsPath?.();
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("SessionRequestHandler applies localized user-message language from live settings snapshot", async () => {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "codeai-hub-gemini-language-sync-")
  );
  let restoreGlobalSettingsPath: (() => void) | undefined;

  try {
    const fixture = await prepareSettingsFixture(
      tempDir,
      "gemini-runtime-language-update",
      {
        general: {
          localization: {
            defaultLanguage: "en",
            categories: {
              artifactsForTheUser: "uk",
              messagesForTheUser: "ru",
            },
          },
        },
        providers: {
          gemini: {
            defaultModel: "gemini-3-pro-preview",
          },
        },
      }
    );
    restoreGlobalSettingsPath = fixture.restoreGlobalSettingsPath;

    const harness = createHarness({
      ...fixture.config,
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
    assert.equal(
      readAppliedProviderTurnConfig(sentTurnOptions[0])
        ?.artifactsForTheUserLanguage,
      "uk"
    );
  } finally {
    restoreGlobalSettingsPath?.();
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("SessionRequestHandler applies session-bound model identity instead of live settings snapshot", async () => {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "codeai-hub-bound-model-sync-")
  );

  try {
    const fixture = await prepareSettingsFixture(
      tempDir,
      "codex-bound-model-update",
      {
        providers: {
          codex: {
            defaultModel: "gpt-5.4-mini",
            reasoningByModel: {
              "gpt-5.4-mini": "low",
            },
          },
        },
      }
    );
    const restoreGlobalSettingsPath = fixture.restoreGlobalSettingsPath;

    try {
      const harness = createHarness(fixture.config);
      const sentTurnOptions: Array<Record<string, unknown> | undefined> = [];
      const session = harness.sessionManager.createSession(
        "codexCli",
        "/tmp/codex-bound-model-update"
      );
      harness.sessionManager.setModelBinding(session.id, {
        key: "test-binding",
        providerId: "codexCli",
        baseModelId: "gpt-5.4-mini",
        modelId: "gpt-5.4-mini reasoning:xhigh",
        reasoningEffort: "xhigh",
        source: "settings_default",
        boundAt: "2026-04-28T12:00:00.000Z",
        updatedAt: "2026-04-28T12:00:00.000Z",
      });
      harness.providerRegistry.getAdapter = () => ({
        sendMessage: (
          _id: string,
          _content: string,
          turnOptions?: Record<string, unknown>
        ) => {
          sentTurnOptions.push(turnOptions);
          return Promise.resolve();
        },
      });
      harness.providerSessions.set(session.id, {
        providerId: "codexCli",
        providerSessionId: "provider-session-bound-codex",
        unsubscribe: noop,
      });

      await harness.handler.handleMessage(session.id, "use bound model");

      const turnConfig = readAppliedProviderTurnConfig(sentTurnOptions[0]);
      assert.equal(turnConfig?.baseModelId, "gpt-5.4-mini");
      assert.equal(
        turnConfig?.effectiveModelId,
        "gpt-5.4-mini reasoning:xhigh"
      );
      assert.equal(turnConfig?.reasoningEffort, "xhigh");
      assert.equal(turnConfig?.source, "session_binding");
    } finally {
      restoreGlobalSettingsPath();
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

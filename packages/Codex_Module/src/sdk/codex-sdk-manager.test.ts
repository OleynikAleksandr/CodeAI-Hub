import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { ActiveSession } from "../session/types";
import { CodexSDKManager } from "./codex-sdk-manager";

const MODEL_REASONING_SUMMARY_AUTO_REGEX = /model_reasoning_summary = "auto"/u;
const MODEL_REASONING_SUMMARY_NONE_REGEX = /model_reasoning_summary = "none"/u;
const LEGACY_REASONING_SUMMARY_REGEX = /default_reasoning_summary/u;

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

test("sanitizeConfigToml adds model_reasoning_summary auto when missing", async () => {
  const codexHome = await mkdtemp(path.join(tmpdir(), "codex-config-"));
  await writeFile(
    path.join(codexHome, "config.toml"),
    [
      'approval_policy = "never"',
      'model = "gpt-5.4"',
      'model_reasoning_effort = "xhigh"',
      "",
      "[features]",
      "unified_exec = true",
      "",
    ].join("\n"),
    "utf8"
  );

  const manager = createManager();
  await (
    manager as unknown as {
      sanitizeConfigToml: (target: string) => Promise<void>;
    }
  ).sanitizeConfigToml(codexHome);

  const next = await readFile(path.join(codexHome, "config.toml"), "utf8");
  assert.match(next, MODEL_REASONING_SUMMARY_AUTO_REGEX);
});

test("sanitizeConfigToml replaces legacy default_reasoning_summary key", async () => {
  const codexHome = await mkdtemp(path.join(tmpdir(), "codex-config-"));
  await writeFile(
    path.join(codexHome, "config.toml"),
    [
      'approval_policy = "never"',
      'model = "gpt-5.4"',
      'model_reasoning_effort = "xhigh"',
      'default_reasoning_summary = "auto"',
      "",
      "[features]",
      "unified_exec = true",
      "",
    ].join("\n"),
    "utf8"
  );

  const manager = createManager();
  await (
    manager as unknown as {
      sanitizeConfigToml: (target: string) => Promise<void>;
    }
  ).sanitizeConfigToml(codexHome);

  const next = await readFile(path.join(codexHome, "config.toml"), "utf8");
  assert.match(next, MODEL_REASONING_SUMMARY_AUTO_REGEX);
  assert.doesNotMatch(next, LEGACY_REASONING_SUMMARY_REGEX);
});

test("sanitizeConfigToml writes none when saved settings disable reasoning summaries", async () => {
  const codexHome = await mkdtemp(path.join(tmpdir(), "codex-config-"));
  const settingsRoot = await mkdtemp(path.join(tmpdir(), "codex-settings-"));
  const settingsPath = path.join(settingsRoot, "settings.json");
  const previousSettingsPath = process.env.CLAUDE_SETTINGS_PATH;

  await writeFile(
    settingsPath,
    JSON.stringify({
      providers: {
        codex: {
          reasoningSummaryEnabled: false,
        },
      },
    }),
    "utf8"
  );
  process.env.CLAUDE_SETTINGS_PATH = settingsPath;

  await writeFile(
    path.join(codexHome, "config.toml"),
    ['approval_policy = "never"', 'model = "gpt-5.4"', ""].join("\n"),
    "utf8"
  );

  try {
    const manager = createManager();
    await (
      manager as unknown as {
        sanitizeConfigToml: (target: string) => Promise<void>;
      }
    ).sanitizeConfigToml(codexHome);
  } finally {
    if (previousSettingsPath) {
      process.env.CLAUDE_SETTINGS_PATH = previousSettingsPath;
    } else {
      process.env.CLAUDE_SETTINGS_PATH = undefined;
    }
  }

  const next = await readFile(path.join(codexHome, "config.toml"), "utf8");
  assert.match(next, MODEL_REASONING_SUMMARY_NONE_REGEX);
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

const createManager = (): CodexSDKManager =>
  new CodexSDKManager({
    installer: {
      ensureInstalled: async () => {
        // noop
      },
      loadModule: async () => ({}) as never,
    },
    authManager: {
      ensureAuthenticated: async () => {
        // noop
      },
    },
    sessions: {
      createSession: (workspacePath: string) => ({
        tempId: "temp-created",
        session: createActiveSession(workspacePath, "temp-created"),
      }),
      createResumedSession: (workspacePath: string, threadId: string) =>
        createActiveSession(workspacePath, threadId),
      getSession: () => undefined,
      closeSession: async () => {
        // noop
      },
    },
    processor: {
      initializeSession: () => {
        // noop
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

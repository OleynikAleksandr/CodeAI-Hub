import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { ActiveSession } from "../session/types";
import type { ClaudeCodeRuntimeProfile } from "./claude-runtime-profile";
import { ClaudeSDKManager } from "./claude-sdk-manager";

const shouldYieldEmptyStreamValue = (): boolean => false;

async function* emptyClaudeStream(): AsyncIterableIterator<never> {
  await Promise.resolve();
  if (shouldYieldEmptyStreamValue()) {
    yield undefined as never;
  }
}

const createManager = (
  settingsPath?: string,
  runtimeProfile?: ClaudeCodeRuntimeProfile
): ClaudeSDKManager =>
  new ClaudeSDKManager({
    authManager: {
      ensureSubscriptionAuth: () => Promise.resolve(),
      getAuthEnvironment: () => ({
        HOME: "/sandbox/provider-home",
      }),
    },
    installer: {
      ensureInstalled: () => Promise.resolve(),
      getExecutablePath: () => "/tmp/claude",
      loadModule: () =>
        Promise.resolve({
          query: () => emptyClaudeStream(),
        }),
    },
    processor: {
      configureContextUsageReader: () => {
        // noop
      },
    },
    runtimeProfile,
    sessions: {},
    workspace: {
      claudeProjectSlug: "workspace-slug",
      defaultModel: "opus",
      settingsPath,
      workspacePath: "/workspace",
    },
  } as never);

const writeClaudeThinkingSettings = async (
  settingsPath: string,
  thinking: {
    readonly effort?: string;
    readonly enabled: boolean;
    readonly maxTokens?: number;
  }
): Promise<void> => {
  await writeFile(
    settingsPath,
    `${JSON.stringify(
      {
        providers: {
          claude: {
            thinking,
          },
        },
      },
      null,
      2
    )}\n`,
    "utf8"
  );
};

const buildQueryOptions = (
  manager: ClaudeSDKManager,
  session: ActiveSession,
  turnOptions?: Record<string, unknown>
): Record<string, unknown> =>
  (
    manager as unknown as {
      buildQueryOptions(payload: {
        readonly outputSchema: Record<string, unknown> | null;
        readonly session: ActiveSession;
        readonly turnOptions?: Record<string, unknown>;
      }): Record<string, unknown>;
    }
  ).buildQueryOptions({
    outputSchema: null,
    session,
    turnOptions,
  });

test("ClaudeSDKManager keeps provider sessions in SDK isolation mode", () => {
  const manager = createManager();

  const options = buildQueryOptions(manager, {
    sessionId: "session-123",
    workspacePath: "/tmp/codeai-workspace",
  } as ActiveSession);

  assert.deepEqual(options.additionalDirectories, ["/tmp/codeai-workspace"]);
  assert.deepEqual(options.settingSources, []);
  assert.equal(typeof options.systemPrompt, "string");
  assert.equal((options.systemPrompt as string).includes("CodeAI Hub"), true);
  assert.equal(
    (options.systemPrompt as string).includes("## Progress Updates"),
    true
  );
  assert.deepEqual(options.tools, ["Read", "Write", "Edit", "WebSearch"]);
  assert.deepEqual(options.env, {
    HOME: "/sandbox/provider-home",
  });
});

test("ClaudeSDKManager applies explicit runtime profile options", () => {
  const manager = createManager(undefined, {
    authMode: "anthropic-api-key",
    id: "claudeCode",
    projectPath: "/provider-home/.claude/projects/custom",
    providerHome: "/provider-home",
    settingSources: [],
    sessionTitle: "CodeAI Claude Custom",
    toolNames: ["Write"],
  });

  const options = buildQueryOptions(manager, {
    sessionId: "session-123",
    workspacePath: "/tmp/codeai-workspace",
  } as ActiveSession);

  assert.equal(options.projectPath, "/provider-home/.claude/projects/custom");
  assert.deepEqual(options.settingSources, []);
  assert.deepEqual(options.tools, ["Write"]);
  assert.equal(options.title, "CodeAI Claude Custom");
});

test("ClaudeSDKManager passes installed executable to auth preflight", async () => {
  let executablePath: string | undefined;
  const manager = new ClaudeSDKManager({
    authManager: {
      ensureSubscriptionAuth: (options?: {
        readonly executablePath?: string;
      }) => {
        executablePath = options?.executablePath;
        return Promise.resolve();
      },
      getAuthEnvironment: () => ({
        HOME: "/sandbox/provider-home",
      }),
    },
    installer: {
      ensureInstalled: () => Promise.resolve(),
      getExecutablePath: () => "/tmp/claude",
      loadModule: () =>
        Promise.resolve({
          query: () => emptyClaudeStream(),
        }),
    },
    processor: {
      configureContextUsageReader: () => {
        // noop
      },
    },
    sessions: {},
    workspace: {
      claudeProjectSlug: "workspace-slug",
      defaultModel: "opus",
      workspacePath: "/workspace",
    },
  } as never);

  await manager.initialize();

  assert.equal(executablePath, "/tmp/claude");
});

test("ClaudeSDKManager uses applied Claude effort instead of deprecated maxThinkingTokens", () => {
  const manager = createManager();

  const options = buildQueryOptions(
    manager,
    {
      sessionId: "session-123",
      workspacePath: "/tmp/codeai-workspace",
    } as ActiveSession,
    {
      __codeaiAppliedTurnConfig: {
        providerId: "claudeCodeCli",
        thinkingEnabled: true,
        reasoningEffort: "high",
      },
    }
  );

  assert.deepEqual(options.thinking, {
    type: "adaptive",
    display: "summarized",
  });
  assert.equal(options.effort, "high");
  assert.equal("maxThinkingTokens" in options, false);
});

test("ClaudeSDKManager maps switched model and xhigh effort to SDK query options", () => {
  const manager = createManager();

  const options = buildQueryOptions(
    manager,
    {
      sessionId: "session-123",
      workspacePath: "/tmp/codeai-workspace",
    } as ActiveSession,
    {
      __codeaiAppliedTurnConfig: {
        providerId: "claudeCodeCli",
        modelId: "haiku",
        thinkingEnabled: true,
        reasoningEffort: "xhigh",
      },
    }
  );

  assert.equal(options.model, "haiku");
  assert.deepEqual(options.thinking, {
    type: "adaptive",
    display: "summarized",
  });
  assert.equal(options.effort, "xhigh");
  assert.deepEqual(options.settingSources, []);
});

test("ClaudeSDKManager maps switched thinking off without SDK effort", () => {
  const manager = createManager();

  const options = buildQueryOptions(
    manager,
    {
      sessionId: "session-123",
      workspacePath: "/tmp/codeai-workspace",
    } as ActiveSession,
    {
      __codeaiAppliedTurnConfig: {
        providerId: "claudeCodeCli",
        baseModelId: "opus",
        thinkingEnabled: false,
      },
    }
  );

  assert.equal(options.model, "opus");
  assert.deepEqual(options.thinking, { type: "disabled" });
  assert.equal("effort" in options, false);
  assert.deepEqual(options.settingSources, []);
});

test("ClaudeSDKManager maps legacy Claude maxTokens snapshots to effort", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "claude-sdk-effort-"));
  const settingsPath = path.join(tempDir, "settings.json");

  try {
    await writeFile(
      settingsPath,
      `${JSON.stringify(
        {
          providers: {
            claude: {
              thinking: {
                enabled: true,
                maxTokens: 32_000,
              },
            },
          },
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const manager = createManager(settingsPath);
    const options = buildQueryOptions(manager, {
      sessionId: "session-123",
      workspacePath: "/tmp/codeai-workspace",
    } as ActiveSession);

    assert.deepEqual(options.thinking, {
      type: "adaptive",
      display: "summarized",
    });
    assert.equal(options.effort, "max");
    assert.equal("maxThinkingTokens" in options, false);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("ClaudeSDKManager reuses cached fallback settings until cache expiry", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "claude-sdk-cache-"));
  const settingsPath = path.join(tempDir, "settings.json");

  try {
    await writeClaudeThinkingSettings(settingsPath, {
      enabled: true,
      effort: "high",
    });
    const manager = createManager(settingsPath);
    const session = {
      sessionId: "session-123",
      workspacePath: "/tmp/codeai-workspace",
    } as ActiveSession;

    const firstOptions = buildQueryOptions(manager, session);

    await writeClaudeThinkingSettings(settingsPath, { enabled: false });
    const cachedOptions = buildQueryOptions(manager, session);

    const cacheOwner = manager as unknown as {
      settingsSnapshotCache: { expiresAtMs: number } | null;
    };
    if (cacheOwner.settingsSnapshotCache) {
      cacheOwner.settingsSnapshotCache.expiresAtMs = 0;
    }
    const expiredOptions = buildQueryOptions(manager, session);

    assert.deepEqual(firstOptions.thinking, {
      type: "adaptive",
      display: "summarized",
    });
    assert.equal(firstOptions.effort, "high");
    assert.deepEqual(cachedOptions.thinking, {
      type: "adaptive",
      display: "summarized",
    });
    assert.equal(cachedOptions.effort, "high");
    assert.deepEqual(expiredOptions.thinking, { type: "disabled" });
    assert.equal("effort" in expiredOptions, false);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("ClaudeSDKManager omits reasoning display when thinking is hidden in dialog", () => {
  const manager = createManager();

  const visibleOptions = buildQueryOptions(
    manager,
    {
      sessionId: "session-123",
      workspacePath: "/tmp/codeai-workspace",
    } as ActiveSession,
    {
      __codeaiAppliedTurnConfig: {
        providerId: "claudeCodeCli",
        reasoningEffort: "high",
        thinkingDisplaySyncEnabled: true,
        thinkingEnabled: true,
      },
    }
  );

  assert.deepEqual(visibleOptions.thinking, {
    type: "adaptive",
    display: "summarized",
  });
  assert.equal(visibleOptions.effort, "high");

  const hiddenOptions = buildQueryOptions(
    manager,
    {
      sessionId: "session-456",
      workspacePath: "/tmp/codeai-workspace",
    } as ActiveSession,
    {
      __codeaiAppliedTurnConfig: {
        providerId: "claudeCodeCli",
        reasoningEffort: "high",
        thinkingDisplaySyncEnabled: false,
        thinkingEnabled: true,
      },
    }
  );

  assert.deepEqual(hiddenOptions.thinking, {
    type: "adaptive",
    display: "omitted",
  });
  assert.equal(hiddenOptions.effort, "high");
});

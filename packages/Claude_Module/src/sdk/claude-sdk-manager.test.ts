import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { ActiveSession } from "../session/types";
import { ClaudeSDKManager } from "./claude-sdk-manager";

const shouldYieldEmptyStreamValue = (): boolean => false;

async function* emptyClaudeStream(): AsyncIterableIterator<never> {
  await Promise.resolve();
  if (shouldYieldEmptyStreamValue()) {
    yield undefined as never;
  }
}

const createManager = (settingsPath?: string): ClaudeSDKManager =>
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
    sessions: {},
    workspace: {
      claudeProjectSlug: "workspace-slug",
      defaultModel: "opus",
      settingsPath,
      workspacePath: "/workspace",
    },
  } as never);

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
  assert.deepEqual(options.env, {
    HOME: "/sandbox/provider-home",
  });
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

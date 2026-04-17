import assert from "node:assert/strict";
import test from "node:test";
import type { CliArgs } from "@google/gemini-cli/dist/src/config/config";
import type { GeminiCliModules } from "../runtime/cli-types";
import { GeminiSessionManager } from "./gemini-session-manager";

interface StopResumeSpy {
  readonly loadCliConfigCalls: CliArgs[];
  resetChatCalls: number;
}

const createStopResumeModules = (
  providerSessionIds: string[],
  spy: StopResumeSpy
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
        return Promise.resolve({
          refreshAuth: () => Promise.resolve(),
          setModel: (_model: string) => {
            // noop
          },
          initialize: () => Promise.resolve(),
          getGeminiClient: () => ({
            resetChat: () => {
              spy.resetChatCalls += 1;
              return Promise.resolve();
            },
          }),
          getModel: () => "gemini-2.5-pro",
          getSessionId: () => providerSessionId,
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

test("GeminiSessionManager.closeSession does not reset provider chat history", async () => {
  const spy: StopResumeSpy = {
    loadCliConfigCalls: [],
    resetChatCalls: 0,
  };
  const manager = new GeminiSessionManager(
    createStopResumeModules(["provider-123"], spy)
  );

  const result = await manager.createSession({
    workspacePath: "/tmp/stop-resume",
  });
  assert.equal(result.sessionId, "provider-123");

  manager.closeSession("provider-123");

  assert.equal(
    spy.resetChatCalls,
    0,
    "closeSession must not call client.resetChat() on Stop"
  );
  assert.equal(manager.listSessions().length, 0);
});

test("GeminiSessionManager.resumeSession forwards pre-stop providerSessionId through argv.resume", async () => {
  const spy: StopResumeSpy = {
    loadCliConfigCalls: [],
    resetChatCalls: 0,
  };
  const manager = new GeminiSessionManager(
    createStopResumeModules(["provider-aaa", "provider-aaa"], spy)
  );

  await manager.createSession({
    workspacePath: "/tmp/stop-resume",
  });
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

import assert from "node:assert/strict";
import test from "node:test";
import type { CliArgs } from "@google/gemini-cli/dist/src/config/config";
import type { GeminiCliModules } from "../runtime/cli-types";
import { GeminiSessionManager } from "./gemini-session-manager";

type LoadCliConfigCall = {
  readonly sessionId: string;
  readonly argv: CliArgs;
  readonly workspacePath: string;
};

const createModules = (
  calls: LoadCliConfigCall[],
  resolvedSessionIds: string[]
): GeminiCliModules => {
  const getNextSessionId = (fallback: string): string => {
    const next = resolvedSessionIds.shift();
    return typeof next === "string" ? next : fallback;
  };

  return {
    config: {
      loadCliConfig: (
        _mergedSettings: unknown,
        sessionId: string,
        argv: CliArgs,
        workspacePath: string
      ) => {
        calls.push({ sessionId, argv, workspacePath });
        const providerSessionId = getNextSessionId(sessionId);
        return Promise.resolve({
          refreshAuth: () => Promise.resolve(),
          setModel: (_model: string) => {
            // noop
          },
          initialize: () => Promise.resolve(),
          getGeminiClient: () => ({
            resetChat: () => Promise.resolve(),
            async *sendMessageStream() {
              // noop stream
            },
            getCurrentSequenceModel: () => null,
            getChat: () => ({
              recordCompletedToolCalls: () => {
                // noop
              },
            }),
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
  } as unknown as GeminiCliModules;
};

test("GeminiSessionManager createSession keeps argv.resume undefined", async () => {
  const calls: LoadCliConfigCall[] = [];
  const manager = new GeminiSessionManager(
    createModules(calls, ["provider-session-created"])
  );

  const result = await manager.createSession({
    workspacePath: "/tmp/workspace-created",
  });

  assert.equal(result.sessionId, "provider-session-created");
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.workspacePath, "/tmp/workspace-created");
  assert.equal(calls[0]?.argv.resume, undefined);
});

test("GeminiSessionManager resumeSession forwards requested session id to argv.resume", async () => {
  const calls: LoadCliConfigCall[] = [];
  const manager = new GeminiSessionManager(
    createModules(calls, ["provider-session-resumed"])
  );

  const result = await manager.resumeSession("resume-session-123", {
    workspacePath: "/tmp/workspace-resumed",
  });

  assert.equal(result.sessionId, "provider-session-resumed");
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.sessionId, "resume-session-123");
  assert.equal(calls[0]?.argv.resume, "resume-session-123");
  assert.equal(calls[0]?.workspacePath, "/tmp/workspace-resumed");
});

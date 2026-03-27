import assert from "node:assert/strict";
import test from "node:test";
import type { CliArgs } from "@google/gemini-cli/dist/src/config/config";
import type { GeminiCliModules } from "../runtime/cli-types";
import { GeminiSessionManager } from "./gemini-session-manager";

const createModules = (resolvedSessionIds: string[]): GeminiCliModules =>
  ({
    config: {
      loadCliConfig: (
        _mergedSettings: unknown,
        _sessionId: string,
        _argv: CliArgs,
        _workspacePath: string
      ) => {
        const providerSessionId = resolvedSessionIds.shift() ?? "provider";
        return Promise.resolve({
          refreshAuth: () => Promise.resolve(),
          setModel: (_model: string) => {
            // noop
          },
          initialize: () => Promise.resolve(),
          getGeminiClient: () => ({
            resetChat: () => Promise.resolve(),
            async *sendMessageStream() {
              yield* [];
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
  }) as unknown as GeminiCliModules;

test("GeminiSessionManager closes aliased provider session through facade id", async () => {
  const manager = new GeminiSessionManager(
    createModules(["provider-session-alias"])
  );

  const result = await manager.resumeSession("resume-session-123", {
    workspacePath: "/tmp/workspace-alias",
  });

  assert.equal(result.sessionId, "provider-session-alias");
  assert.ok(manager.getSession("provider-session-alias"));

  await manager.closeSession("resume-session-123");

  assert.equal(manager.getSession("provider-session-alias"), undefined);
  assert.equal(manager.listSessions().length, 0);
});

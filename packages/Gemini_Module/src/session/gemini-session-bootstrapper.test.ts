import assert from "node:assert/strict";
import test from "node:test";
import type { CliArgs } from "@google/gemini-cli/dist/src/config/config";
import type { GeminiCliModules } from "../runtime/cli-types";
import { GeminiSessionBootstrapper } from "./gemini-session-bootstrapper";

interface LoadCliConfigCall {
  readonly argv: CliArgs;
  readonly sessionId: string;
  readonly workspacePath: string;
}

const createModules = (
  calls: LoadCliConfigCall[],
  resolvedSessionIds: string[]
): GeminiCliModules =>
  ({
    config: {
      loadCliConfig: (
        _mergedSettings: unknown,
        sessionId: string,
        argv: CliArgs,
        workspacePath: string
      ) => {
        calls.push({ sessionId, argv, workspacePath });
        const providerSessionId = resolvedSessionIds.shift() ?? sessionId;
        return Promise.resolve({
          refreshAuth: () => Promise.resolve(),
          setModel: (_model: string) => {
            // noop
          },
          initialize: () => Promise.resolve(),
          getGeminiClient: () => ({
            resetChat: () => Promise.resolve(),
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

test("GeminiSessionBootstrapper keeps argv.resume undefined for create session", async () => {
  const calls: LoadCliConfigCall[] = [];
  const bootstrapper = new GeminiSessionBootstrapper(
    createModules(calls, ["provider-session-created"])
  );

  const result = await bootstrapper.bootstrap({
    workspacePath: "/tmp/workspace-created",
  });

  assert.equal(result.providerSessionId, "provider-session-created");
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.sessionId, result.requestedSessionId);
  assert.equal(calls[0]?.argv.resume, undefined);
  const includeDirectories = calls[0]?.argv.includeDirectories ?? [];
  assert.ok(includeDirectories.includes("/tmp/workspace-created"));
});

test("GeminiSessionBootstrapper forwards requested resume id to argv.resume", async () => {
  const calls: LoadCliConfigCall[] = [];
  const bootstrapper = new GeminiSessionBootstrapper(
    createModules(calls, ["provider-session-resumed"])
  );

  const result = await bootstrapper.bootstrap({
    workspacePath: "/tmp/workspace-resumed",
    resumeSessionId: "resume-session-123",
  });

  assert.equal(result.requestedSessionId, "resume-session-123");
  assert.equal(result.providerSessionId, "provider-session-resumed");
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.sessionId, "resume-session-123");
  assert.equal(calls[0]?.argv.resume, "resume-session-123");
  assert.equal(calls[0]?.workspacePath, "/tmp/workspace-resumed");
});

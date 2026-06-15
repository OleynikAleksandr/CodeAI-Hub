import assert from "node:assert/strict";
import test from "node:test";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { CliArgs } from "../runtime/gemini-cli-compat";
import { GeminiSessionBootstrapper } from "./gemini-session-bootstrapper";

interface LoadCliConfigCall {
  readonly argv: CliArgs;
  readonly sessionId: string;
  readonly workspacePath: string;
}

const createClient = () => ({
  resetChat: () => Promise.resolve(),
});

const createModules = (
  calls: LoadCliConfigCall[],
  resolvedSessionIds: string[],
  clientFactory: () => Record<string, unknown> = createClient
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
          getGeminiClient: () => clientFactory(),
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

test("GeminiSessionBootstrapper patches vulnerable loop recovery path", async () => {
  const calls: LoadCliConfigCall[] = [];
  const recoverArgs: unknown[][] = [];
  const client = {
    resetChat: () => Promise.resolve(),
    startChat: () => Promise.resolve({}),
    _recoverFromLoop: (...args: unknown[]) => {
      recoverArgs.push(args);
      const controllerToAbort = args[6] as AbortController | undefined;
      controllerToAbort?.abort();
      return args;
    },
  };

  const bootstrapper = new GeminiSessionBootstrapper(
    createModules(calls, ["provider-session-loop"], () => client)
  );

  const result = await bootstrapper.bootstrap({
    workspacePath: "/tmp/workspace-loop",
  });

  const abortController = new AbortController();
  const patchedClient = result.session.client as unknown as typeof client;
  const returned = patchedClient._recoverFromLoop?.(
    { count: 1 },
    abortController.signal,
    "prompt-loop",
    5,
    false,
    undefined,
    abortController
  );

  assert.deepEqual(returned, [
    { count: 1 },
    abortController.signal,
    "prompt-loop",
    5,
    false,
    undefined,
    undefined,
  ]);
  assert.equal(recoverArgs.length, 1);
  assert.equal(recoverArgs[0]?.[6], undefined);
  assert.equal(abortController.signal.aborted, false);
});

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
  resolvedSessionIds: string[],
  streamEventsByCall: Array<readonly unknown[]> = []
): GeminiCliModules => {
  const getNextSessionId = (fallback: string): string => {
    const next = resolvedSessionIds.shift();
    return typeof next === "string" ? next : fallback;
  };
  const getNextStreamEvents = (): readonly unknown[] => {
    const next = streamEventsByCall.shift();
    return Array.isArray(next) ? next : [];
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
              await Promise.resolve();
              for (const event of getNextStreamEvents()) {
                yield event;
              }
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
    turn: {
      GeminiEventType: {
        Content: "content",
        Citation: "citation",
        ToolCallRequest: "tool_call_request",
        ToolCallResponse: "tool_call_response",
        ToolCallConfirmation: "tool_call_confirmation",
        ChatCompressed: "chat_compressed",
        ContextWindowWillOverflow: "context_window_will_overflow",
        Retry: "retry",
        Thought: "thought",
        MaxSessionTurns: "max_session_turns",
        LoopDetected: "loop_detected",
        InvalidStream: "invalid_stream",
        Finished: "finished",
        Error: "error",
        UserCancelled: "user_cancelled",
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
  assert.ok(
    Array.isArray(calls[0]?.argv.includeDirectories),
    "argv.includeDirectories is an array"
  );
  assert.ok(
    calls[0]?.argv.includeDirectories.includes("/tmp/workspace-created"),
    "workspacePath is included in argv.includeDirectories"
  );
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
  assert.ok(
    Array.isArray(calls[0]?.argv.includeDirectories),
    "argv.includeDirectories is an array"
  );
  assert.ok(
    calls[0]?.argv.includeDirectories.includes("/tmp/workspace-resumed"),
    "workspacePath is included in argv.includeDirectories"
  );
});

test("GeminiSessionManager does not emit final aggregate assistant when segments already streamed", async () => {
  const calls: LoadCliConfigCall[] = [];
  const manager = new GeminiSessionManager(
    createModules(
      calls,
      ["provider-session-streamed"],
      [
        [
          { type: "content", value: "First segment" },
          {
            type: "finished",
            value: { usageMetadata: { totalTokenCount: 10 } },
          },
          { type: "content", value: "Second segment" },
          {
            type: "finished",
            value: { usageMetadata: { totalTokenCount: 20 } },
          },
        ],
      ]
    )
  );

  const result = await manager.createSession({
    workspacePath: "/tmp/workspace-streamed",
  });
  const events: unknown[] = [];
  result.session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });

  await manager.sendMessage(result.sessionId, "Segment this response");

  const assistantEvents = events.filter(
    (payload) => (payload as { type?: string }).type === "assistant"
  );
  const dialogAssistantEvents = events.filter(
    (payload) =>
      (payload as { type?: string }).type === "dialog_message" &&
      (payload as { role?: string }).role === "assistant"
  );
  const turnCompletedEvents = events.filter(
    (payload) => (payload as { type?: string }).type === "turn_completed"
  );
  const tokenUsageEvents = events.filter(
    (payload) =>
      (payload as { type?: string }).type === "stream_event" &&
      (payload as { data?: { kind?: string } }).data?.kind === "token_usage"
  );

  assert.equal(assistantEvents.length, 0);
  assert.deepEqual(
    dialogAssistantEvents.map(
      (payload) => (payload as { content?: string }).content
    ),
    ["First segment", "Second segment"]
  );
  assert.equal(turnCompletedEvents.length, 1);
  assert.equal(tokenUsageEvents.length, 1);
});

test("GeminiSessionManager falls back to final assistant emit when no segment finished event arrived", async () => {
  const calls: LoadCliConfigCall[] = [];
  const manager = new GeminiSessionManager(
    createModules(
      calls,
      ["provider-session-fallback"],
      [[{ type: "content", value: "Fallback assistant text" }]]
    )
  );

  const result = await manager.createSession({
    workspacePath: "/tmp/workspace-fallback",
  });
  const events: unknown[] = [];
  result.session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });

  await manager.sendMessage(result.sessionId, "Fallback please");

  const assistantEvents = events.filter(
    (payload) => (payload as { type?: string }).type === "assistant"
  );
  const dialogAssistantEvents = events.filter(
    (payload) =>
      (payload as { type?: string }).type === "dialog_message" &&
      (payload as { role?: string }).role === "assistant"
  );

  assert.equal(dialogAssistantEvents.length, 0);
  assert.equal(assistantEvents.length, 1);
  assert.equal(
    (assistantEvents[0] as { content?: string }).content,
    "Fallback assistant text"
  );
});

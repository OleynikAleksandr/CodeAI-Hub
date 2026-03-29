import assert from "node:assert/strict";
import test from "node:test";
import type { CliArgs } from "@google/gemini-cli/dist/src/config/config";
import type { GeminiCliModules } from "../runtime/cli-types";
import { GeminiSessionManager } from "./gemini-session-manager";

type StreamPlan = readonly unknown[] | "stall_after_model_info";
const STALLED_TURN_TIMEOUT_RE =
  /Gemini stream stalled after 20ms without progress\./;

const createModules = (
  resolvedSessionIds: string[],
  streamPlansByCall: StreamPlan[]
): GeminiCliModules => {
  const getNextStreamPlan = (): StreamPlan => {
    const next = streamPlansByCall.shift();
    return next ?? [];
  };

  return {
    config: {
      loadCliConfig: (
        _mergedSettings: unknown,
        sessionId: string,
        _argv: CliArgs,
        _workspacePath: string
      ) => {
        const providerSessionId = resolvedSessionIds.shift() ?? sessionId;
        return Promise.resolve({
          refreshAuth: () => Promise.resolve(),
          setModel: (_model: string) => {
            // noop
          },
          initialize: () => Promise.resolve(),
          getGeminiClient: () => ({
            resetChat: () => Promise.resolve(),
            async *sendMessageStream() {
              const plan = getNextStreamPlan();
              if (plan === "stall_after_model_info") {
                yield { type: "model_info", value: "gemini-2.5-pro" };
                await new Promise(() => {
                  // Intentionally never resolves to simulate a silent stall.
                });
                return;
              }
              await Promise.resolve();
              for (const event of plan) {
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

test("Gemini turn runner skips aggregate assistant emit when segments already streamed", async () => {
  const manager = new GeminiSessionManager(
    createModules(
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

test("Gemini turn runner falls back to final assistant emit when no segment finished event arrived", async () => {
  const manager = new GeminiSessionManager(
    createModules(
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

test("Gemini turn runner fails stalled streams after watchdog timeout", async () => {
  const manager = new GeminiSessionManager(
    createModules(["provider-session-stalled"], ["stall_after_model_info"])
  );

  const result = await manager.createSession({
    workspacePath: "/tmp/workspace-stalled",
  });
  (result.session as unknown as Record<string, unknown>).stalledTurnWatchdogMs =
    20;
  const events: unknown[] = [];
  result.session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });

  await assert.rejects(async () => {
    await manager.sendMessage(result.sessionId, "Stall this response");
  }, STALLED_TURN_TIMEOUT_RE);

  assert.equal(result.session.status, "idle");
  assert.equal(
    events.some(
      (payload) => (payload as { type?: string }).type === "turn_completed"
    ),
    false
  );
});

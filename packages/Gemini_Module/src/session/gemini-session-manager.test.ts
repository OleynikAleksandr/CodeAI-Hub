import assert from "node:assert/strict";
import test from "node:test";
import type { CliArgs } from "@google/gemini-cli/dist/src/config/config";
import type { GeminiCliModules } from "../runtime/cli-types";
import { GeminiSessionManager } from "./gemini-session-manager";

type StreamPlan = readonly unknown[] | "stall_after_model_info";
const RECOVERABLE_TURN_FAILURE_CODE = "GEMINI_RECOVERABLE_TURN_FAILURE";
const STALLED_TURN_TIMEOUT_RE =
  /Gemini stream stalled after 20ms without progress\./;

const createModules = (
  resolvedSessionIds: string[],
  streamPlansByCall: StreamPlan[] = []
): GeminiCliModules =>
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
            async *sendMessageStream(): AsyncGenerator<unknown> {
              const plan = streamPlansByCall.shift() ?? [];
              if (plan === "stall_after_model_info") {
                yield { type: "model_info", value: "gemini-2.5-pro" };
                await new Promise(() => {
                  // Intentionally never resolves to simulate a silent stall.
                });
                return;
              }
              yield* plan;
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

test("GeminiSessionManager emits recoverable turn_failed and allows next send after stalled timeout", async () => {
  const manager = new GeminiSessionManager(
    createModules(
      ["provider-session-recoverable"],
      [
        "stall_after_model_info",
        [
          { type: "content", value: "Recovered answer" },
          {
            type: "finished",
            value: { usageMetadata: { totalTokenCount: 7 } },
          },
        ],
      ]
    )
  );

  const result = await manager.createSession({
    workspacePath: "/tmp/workspace-recoverable",
  });
  (result.session as unknown as Record<string, unknown>).stalledTurnWatchdogMs =
    20;
  const events: unknown[] = [];
  result.session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });

  await assert.rejects(
    async () => {
      await manager.sendMessage(result.sessionId, "First stalled attempt");
    },
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal(
        (error as Error & { code?: string }).code,
        RECOVERABLE_TURN_FAILURE_CODE
      );
      assert.match((error as Error).message, STALLED_TURN_TIMEOUT_RE);
      return true;
    }
  );

  const failedEvents = events.filter(
    (payload) => (payload as { type?: string }).type === "turn_failed"
  );
  assert.equal(failedEvents.length, 1);
  assert.equal(result.session.status, "idle");

  await manager.sendMessage(result.sessionId, "Second recovered attempt");

  assert.equal(
    events.some(
      (payload) =>
        (payload as { type?: string }).type === "dialog_message" &&
        (payload as { content?: string }).content === "Recovered answer"
    ),
    true
  );
  assert.equal(
    events.filter(
      (payload) => (payload as { type?: string }).type === "turn_completed"
    ).length,
    1
  );
});

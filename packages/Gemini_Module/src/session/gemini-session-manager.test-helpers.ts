import type { CliArgs } from "@google/gemini-cli/dist/src/config/config";
import type { CompletedToolCall } from "@google/gemini-cli-core/dist/src/core/coreToolScheduler";
import type { ToolCallRequestInfo } from "@google/gemini-cli-core/dist/src/core/turn";
import type { GeminiCliModules } from "../runtime/cli-types";

export type StreamPlan =
  | readonly unknown[]
  | "stall_after_model_info"
  | "stall_after_terminal_answer"
  | "delayed_terminal_answer";

export const RECOVERABLE_TURN_FAILURE_CODE = "GEMINI_RECOVERABLE_TURN_FAILURE";
export const createStalledTurnTimeoutRe = (timeoutMs: number): RegExp =>
  new RegExp(`Gemini stream stalled after ${timeoutMs}ms without progress\\.`);
export const DEFAULT_STALLED_TURN_TIMEOUT_RE = createStalledTurnTimeoutRe(20);

const DELAYED_TERMINAL_ANSWER_MS = 20;

const waitForAbort = async (signal?: AbortSignal): Promise<void> => {
  if (!signal || signal.aborted) {
    return;
  }
  await new Promise<void>((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
};

export const createToolRequest = (callId: string): ToolCallRequestInfo => ({
  callId,
  name: "write_file",
  args: {
    path: "Final_Description.md",
    content: "# Final Description\n\nDraft",
  },
  isClientInitiated: false,
  prompt_id: "prompt-1",
});

const createCompletedCall = (request: ToolCallRequestInfo): CompletedToolCall =>
  ({
    status: "success",
    request,
    response: {
      callId: request.callId,
      responseParts: [{ text: "Final_Description.md updated." }],
      resultDisplay: "Final_Description.md updated.",
      error: undefined,
      errorType: undefined,
      contentLength: 29,
    },
    tool: {},
    invocation: {},
  }) as unknown as CompletedToolCall;

export const createModules = (
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
            async *sendMessageStream(
              _parts?: unknown,
              signal?: AbortSignal
            ): AsyncGenerator<unknown> {
              const plan = streamPlansByCall.shift() ?? [];
              if (plan === "stall_after_model_info") {
                yield { type: "model_info", value: "gemini-2.5-pro" };
                await waitForAbort(signal);
                return;
              }
              if (plan === "stall_after_terminal_answer") {
                yield { type: "content", value: "Terminal answer" };
                yield {
                  type: "finished",
                  value: { usageMetadata: { totalTokenCount: 11 } },
                };
                await waitForAbort(signal);
                return;
              }
              if (plan === "delayed_terminal_answer") {
                yield { type: "model_info", value: "gemini-2.5-pro" };
                await new Promise((resolve) =>
                  setTimeout(resolve, DELAYED_TERMINAL_ANSWER_MS)
                );
                yield { type: "content", value: "Delayed final answer" };
                yield {
                  type: "finished",
                  value: { usageMetadata: { totalTokenCount: 13 } },
                };
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
    toolScheduler: {
      CoreToolScheduler: class {
        private readonly options: {
          readonly onAllToolCallsComplete: (
            completedToolCalls: readonly CompletedToolCall[]
          ) => Promise<void> | void;
        };

        constructor(options: {
          readonly onAllToolCallsComplete: (
            completedToolCalls: readonly CompletedToolCall[]
          ) => Promise<void> | void;
        }) {
          this.options = options;
        }

        async schedule(
          request: ToolCallRequestInfo,
          _signal: AbortSignal
        ): Promise<void> {
          await this.options.onAllToolCallsComplete([
            createCompletedCall(request),
          ]);
        }
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

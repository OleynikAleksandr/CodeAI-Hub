import assert from "node:assert/strict";
import test from "node:test";
import type { GeminiCliModules } from "../runtime/cli-types";
import type {
  CompletedToolCall,
  ToolCallRequestInfo,
} from "../runtime/gemini-cli-compat";
import { GeminiToolExecutorFacade } from "./gemini-tool-executor-facade";

const createToolRequest = (): ToolCallRequestInfo => ({
  callId: "call-1",
  name: "shell",
  args: { cmd: "echo hi" },
  isClientInitiated: false,
  prompt_id: "prompt-1",
});

const createCompletedCall = (request: ToolCallRequestInfo): CompletedToolCall =>
  ({
    status: "success",
    request,
    response: {
      callId: request.callId,
      responseParts: [],
      resultDisplay: "ok",
      error: undefined,
      errorType: undefined,
      contentLength: 2,
    },
    tool: {},
    invocation: {},
  }) as unknown as CompletedToolCall;

test("GeminiToolExecutorFacade executes through CoreToolScheduler with AgentLoopContext", async () => {
  const request = createToolRequest();
  const expected = createCompletedCall(request);
  let scheduledRequest: ToolCallRequestInfo | null = null;
  let receivedContext: Record<string, unknown> | null = null;
  const modules = {
    toolScheduler: {
      CoreToolScheduler: class {
        private readonly options: {
          readonly onAllToolCallsComplete: (
            completedToolCalls: readonly CompletedToolCall[]
          ) => Promise<void>;
        };

        constructor(options: {
          readonly context: Record<string, unknown>;
          readonly onAllToolCallsComplete: (
            completedToolCalls: readonly CompletedToolCall[]
          ) => Promise<void>;
        }) {
          this.options = options;
          receivedContext = options.context;
        }

        async schedule(
          nextRequest: ToolCallRequestInfo,
          _signal: AbortSignal
        ): Promise<void> {
          scheduledRequest = nextRequest;
          await this.options.onAllToolCallsComplete([expected]);
        }
      },
    },
  } as unknown as GeminiCliModules;

  const facade = new GeminiToolExecutorFacade(modules);
  const result = await facade.execute(
    {} as never,
    request,
    new AbortController().signal
  );
  assert.equal(result, expected);
  assert.deepEqual(scheduledRequest, request);
  assert.ok(receivedContext, "Scheduler should receive AgentLoopContext");
  assert.equal(
    (receivedContext as Record<string, unknown>).promptId,
    "prompt-1"
  );
});

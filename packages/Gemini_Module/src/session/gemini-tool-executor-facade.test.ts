import assert from "node:assert/strict";
import test from "node:test";
import type { CompletedToolCall } from "@google/gemini-cli-core/dist/src/core/coreToolScheduler";
import type { ToolCallRequestInfo } from "@google/gemini-cli-core/dist/src/core/turn";
import type { GeminiCliModules } from "../runtime/cli-types";
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

test("GeminiToolExecutorFacade uses legacy nonInteractive executor when available", async () => {
  const request = createToolRequest();
  const expected = createCompletedCall(request);
  let schedulerConstructed = false;
  const modules = {
    toolExecutor: {
      executeToolCall: async () => expected,
    },
    toolScheduler: {
      CoreToolScheduler: class {
        constructor() {
          schedulerConstructed = true;
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
  assert.equal(schedulerConstructed, false);
});

test("GeminiToolExecutorFacade executes through scheduler fallback when legacy executor is missing", async () => {
  const request = createToolRequest();
  const expected = createCompletedCall(request);
  let scheduledRequest: ToolCallRequestInfo | null = null;
  const modules = {
    toolExecutor: null,
    toolScheduler: {
      CoreToolScheduler: class {
        private readonly options: {
          readonly onAllToolCallsComplete: (
            completedToolCalls: readonly CompletedToolCall[]
          ) => Promise<void>;
        };

        constructor(options: {
          readonly onAllToolCallsComplete: (
            completedToolCalls: readonly CompletedToolCall[]
          ) => Promise<void>;
        }) {
          this.options = options;
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
});

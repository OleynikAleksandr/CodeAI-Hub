import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { ActiveSession } from "../session/types";
import { formatGeminiStreamErrorMessage } from "./gemini-stream-error";
import { GeminiMessageProcessor } from "./message-processor";

const createModules = (): GeminiCliModules =>
  ({
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
  }) as GeminiCliModules;

const createSession = (): ActiveSession =>
  ({
    sessionId: "gemini-test-session",
    createdAt: Date.now(),
    eventEmitter: new EventEmitter(),
    config: {},
    client: {},
    workspacePath: "/tmp/gemini-test-workspace",
    contextWindowTokenLimit: 300_000,
    runtimeTurnConfig: {},
    status: "idle",
    abortController: null,
    logger: {
      logRawEvent: () => {
        // noop
      },
      logEvent: () => {
        // noop
      },
    },
  }) as unknown as ActiveSession;

test("formatGeminiStreamErrorMessage extracts nested error message", () => {
  const message = formatGeminiStreamErrorMessage({
    error: { message: "No capacity available for model gemini-3-pro-preview" },
  });

  assert.equal(message, "No capacity available for model gemini-3-pro-preview");
});

test("formatGeminiStreamErrorMessage returns null for non-object values", () => {
  assert.equal(formatGeminiStreamErrorMessage(null), null);
  assert.equal(formatGeminiStreamErrorMessage(undefined), null);
  assert.equal(formatGeminiStreamErrorMessage(123), null);
});

test("GeminiMessageProcessor flushes assistant segments on finished", () => {
  const processor = new GeminiMessageProcessor({
    modules: createModules(),
  });
  const session = createSession();
  const accumulator = processor.createAccumulator("prompt-123");
  const messages: unknown[] = [];

  session.eventEmitter.on("message", (payload) => {
    messages.push(payload);
  });

  processor.handleEvent(
    session,
    { type: "content", value: "First " } as never,
    accumulator
  );
  processor.handleEvent(
    session,
    { type: "content", value: "segment" } as never,
    accumulator
  );
  processor.handleEvent(
    session,
    {
      type: "finished",
      value: { usageMetadata: { totalTokenCount: 11 } },
    } as never,
    accumulator
  );
  processor.handleEvent(
    session,
    { type: "content", value: "Second segment" } as never,
    accumulator
  );
  processor.handleEvent(
    session,
    {
      type: "finished",
      value: { usageMetadata: { totalTokenCount: 22 } },
    } as never,
    accumulator
  );

  assert.equal(messages.length, 2);
  assert.deepEqual(
    messages.map((payload) => ({
      type: (payload as { type: string }).type,
      role: (payload as { role: string }).role,
      content: (payload as { content: string }).content,
    })),
    [
      {
        type: "dialog_message",
        role: "assistant",
        content: "First segment",
      },
      {
        type: "dialog_message",
        role: "assistant",
        content: "Second segment",
      },
    ]
  );

  const finalized = processor.finalize(accumulator);
  assert.equal(finalized.responseText, "First segmentSecond segment");
  assert.equal(finalized.usage?.totalTokenCount, 22);
});

test("GeminiMessageProcessor keeps partial assistant chunks buffered until finished", () => {
  const processor = new GeminiMessageProcessor({
    modules: createModules(),
  });
  const session = createSession();
  const accumulator = processor.createAccumulator("prompt-stalled");
  const messages: unknown[] = [];

  session.eventEmitter.on("message", (payload) => {
    messages.push(payload);
  });

  processor.handleEvent(
    session,
    { type: "content", value: "Partial " } as never,
    accumulator
  );
  processor.handleEvent(
    session,
    { type: "content", value: "response" } as never,
    accumulator
  );

  assert.equal(messages.length, 0);
  assert.equal(
    processor.finalize(accumulator).responseText,
    "Partial response"
  );
});

test("GeminiMessageProcessor still emits thinking bubbles when display sync is disabled", () => {
  const translationCalls: string[] = [];
  const processor = new GeminiMessageProcessor({
    modules: createModules(),
    thoughtTranslator: {
      translateThought: (
        _thought: { readonly description: string; readonly subject: string },
        targetLanguage?: string
      ) => {
        translationCalls.push(targetLanguage ?? "");
        return Promise.resolve("Планирование: Нужно подумать перед ответом");
      },
    } as unknown as ConstructorParameters<
      typeof GeminiMessageProcessor
    >[0]["thoughtTranslator"],
  });
  const session = createSession();
  session.runtimeTurnConfig.messagesForTheUserLanguage = "ru";
  session.runtimeTurnConfig.thinkingDisplaySyncEnabled = false;
  const accumulator = processor.createAccumulator("prompt-thinking-disabled");
  const messages: unknown[] = [];

  session.eventEmitter.on("message", (payload) => {
    messages.push(payload);
  });

  processor.handleEvent(
    session,
    {
      type: "thought",
      value: {
        subject: "Planning",
        description: "Need to think before answering",
      },
    } as never,
    accumulator
  );

  return Promise.resolve().then(() => {
    assert.deepEqual(translationCalls, ["ru"]);
    assert.equal(
      messages.some(
        (payload) =>
          (payload as { type?: string }).type === "dialog_message" &&
          (payload as { role?: string }).role === "assistant" &&
          (payload as { tag?: string }).tag === "thinking" &&
          (payload as { content?: string }).content ===
            "Планирование: Нужно подумать перед ответом"
      ),
      true
    );
  });
});

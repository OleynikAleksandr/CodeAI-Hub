import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { access, readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import test from "node:test";
import { GeminiSessionLogger } from "../logging/session-logger";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { ActiveSession } from "../session/types";
import {
  formatGeminiStreamErrorMessage,
  GeminiMessageProcessor,
} from "./message-processor";

const LOG_ROOT = path.join(homedir(), ".codeai-hub", "logs", "gemini");
const FILE_PREFIX = "sdk-gemini";
const GEMINI_MODEL_INFO_PATTERN = /gemini-2\.5-pro/u;
const GEMINI_FEEDBACK_TYPE_PATTERN = /model_info/u;

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

const createSession = (logger?: ActiveSession["logger"]): ActiveSession =>
  ({
    sessionId: "gemini-test-session",
    createdAt: Date.now(),
    eventEmitter: new EventEmitter(),
    config: {},
    client: {},
    workspacePath: "/tmp/gemini-test-workspace",
    contextWindowTokenLimit: 300_000,
    status: "idle",
    abortController: null,
    logger: (logger ?? {
      logRawEvent: () => {
        // noop
      },
      logEvent: () => {
        // noop
      },
    }) as unknown as ActiveSession["logger"],
  }) as unknown as ActiveSession;

const toLogFilePath = (sessionId: string): string => {
  const safeId = sessionId.replace(/[^a-zA-Z0-9]/g, "-");
  return path.join(LOG_ROOT, `${FILE_PREFIX}-${safeId}.jsonl`);
};

const waitForLogContent = async (
  filePath: string,
  token: string
): Promise<string> => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      await access(filePath);
      const content = await readFile(filePath, "utf8");
      if (content.includes(token)) {
        return content;
      }
    } catch {
      // keep polling until logger flushes the file
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error(`Timed out waiting for log token "${token}" in ${filePath}`);
};

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

test("GeminiMessageProcessor persists provider-confirmed model_info feedback", async () => {
  const processor = new GeminiMessageProcessor({ modules: createModules() });
  const sessionId = `gemini-model-info-${Date.now()}`;
  const filePath = toLogFilePath(sessionId);
  await rm(filePath, { force: true });

  const logger = new GeminiSessionLogger();
  logger.start(sessionId);
  const session = createSession(logger);
  session.sessionId = sessionId;
  processor.handleEvent(
    session,
    { type: "model_info", value: "gemini-2.5-pro" } as never,
    processor.createAccumulator("prompt-model-info")
  );
  logger.end();

  const content = await waitForLogContent(filePath, "provider_feedback");
  assert.match(content, GEMINI_MODEL_INFO_PATTERN);
  assert.match(content, GEMINI_FEEDBACK_TYPE_PATTERN);

  await rm(filePath, { force: true });
});

test("GeminiMessageProcessor persists provider-confirmed thought feedback and usage", async () => {
  const processor = new GeminiMessageProcessor({ modules: createModules() });
  const sessionId = `gemini-thought-${Date.now()}`;
  const filePath = toLogFilePath(sessionId);
  await rm(filePath, { force: true });

  const logger = new GeminiSessionLogger();
  logger.start(sessionId);
  const session = createSession(logger);
  session.sessionId = sessionId;
  const accumulator = processor.createAccumulator("prompt-thought");
  processor.handleEvent(
    session,
    {
      type: "thought",
      value: { subject: "Plan", description: "Reason about the fix" },
    } as never,
    accumulator
  );
  processor.handleEvent(
    session,
    {
      type: "finished",
      value: {
        usageMetadata: { thoughtsTokenCount: 17, totalTokenCount: 42 },
      },
    } as never,
    accumulator
  );
  logger.end();

  const content = await waitForLogContent(
    filePath,
    '"feedbackType":"thought_usage"'
  );
  assert.equal(content.includes('"feedbackType":"thought"'), true);
  assert.equal(content.includes('"thoughtsTokenCount":17'), true);

  await rm(filePath, { force: true });
});

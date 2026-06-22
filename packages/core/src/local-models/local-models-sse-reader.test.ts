import assert from "node:assert/strict";
import test from "node:test";
import {
  readLmStudioCompletionsText,
  readLmStudioNativeChatResult,
} from "./local-models-sse-reader";

const NO_CHAT_END_PATTERN = /without a chat\.end event/u;

const encode = (chunks: readonly string[]): Uint8Array[] =>
  chunks.map((chunk) => new TextEncoder().encode(chunk));

const createStreamResponse = (chunks: readonly string[]): Response =>
  ({
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of encode(chunks)) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    }),
  }) as Response;

const nativeChatEndFrame = (result: unknown): string =>
  `event: chat.end\ndata: ${JSON.stringify({ result, type: "chat.end" })}\n\n`;

test("readLmStudioNativeChatResult extracts the chat.end result payload", async () => {
  const response = createStreamResponse([
    nativeChatEndFrame({
      output: [{ content: "Финальный ответ.", type: "message" }],
    }),
  ]);

  const result = await readLmStudioNativeChatResult(response);

  assert.deepEqual(result, {
    output: [{ content: "Финальный ответ.", type: "message" }],
  });
});

test("readLmStudioNativeChatResult reassembles frames split across chunks", async () => {
  const frame = nativeChatEndFrame({
    output: [{ content: "Чанк на границе.", type: "message" }],
  });
  const mid = Math.floor(frame.length / 2);
  const response = createStreamResponse([
    frame.slice(0, mid),
    frame.slice(mid),
  ]);

  const result = await readLmStudioNativeChatResult(response);

  assert.deepEqual(result, {
    output: [{ content: "Чанк на границе.", type: "message" }],
  });
});

test("readLmStudioNativeChatResult ignores non-terminal frames until chat.end", async () => {
  const response = createStreamResponse([
    'event: chat.start\ndata: {"type":"chat.start"}\n\n',
    'event: message.delta\ndata: {"type":"message.delta","content":"partial"}\n\n',
    nativeChatEndFrame({ output: [{ content: "ok", type: "message" }] }),
  ]);

  const result = await readLmStudioNativeChatResult(response);

  assert.deepEqual(result, { output: [{ content: "ok", type: "message" }] });
});

test("readLmStudioNativeChatResult rejects when stream ends without chat.end", async () => {
  const response = createStreamResponse([
    'event: chat.start\ndata: {"type":"chat.start"}\n\n',
  ]);

  await assert.rejects(
    () => readLmStudioNativeChatResult(response),
    NO_CHAT_END_PATTERN
  );
});

test("readLmStudioCompletionsText accumulates delta content until [DONE]", async () => {
  const response = createStreamResponse([
    'data: {"choices":[{"delta":{"content":"Привет"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":", мир."}}]}\n\n',
    "data: [DONE]\n\n",
  ]);

  const text = await readLmStudioCompletionsText(response);

  assert.equal(text, "Привет, мир.");
});

test("readLmStudioCompletionsText reassembles deltas split across chunks", async () => {
  const firstFrame = 'data: {"choices":[{"delta":{"content":"ABC"}}]}\n\n';
  const secondFrame = 'data: {"choices":[{"delta":{"content":"DEF"}}]}\n\n';
  const response = createStreamResponse([
    firstFrame.slice(0, 10),
    firstFrame.slice(10) + secondFrame.slice(0, 12),
    secondFrame.slice(12),
  ]);

  const text = await readLmStudioCompletionsText(response);

  assert.equal(text, "ABCDEF");
});

test("readLmStudioCompletionsText returns null when no content deltas arrived", async () => {
  const response = createStreamResponse([
    'data: {"choices":[{"delta":{"content":"   "}}]}\n\n',
    "data: [DONE]\n\n",
  ]);

  const text = await readLmStudioCompletionsText(response);

  assert.equal(text, null);
});

test("readLmStudioCompletionsText ignores malformed data frames", async () => {
  const response = createStreamResponse([
    "data: not-json\n\n",
    'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
    "data: [DONE]\n\n",
  ]);

  const text = await readLmStudioCompletionsText(response);

  assert.equal(text, "ok");
});

test("readLmStudioNativeChatResult invokes onDelta for each message.delta chunk", async () => {
  const response = createStreamResponse([
    'data: {"type":"message.delta","content":"Hello"}\n\n',
    'data: {"type":"message.delta","content":", world"}\n\n',
    nativeChatEndFrame({
      output: [{ content: "Hello, world", type: "message" }],
    }),
  ]);
  const chunks: string[] = [];

  const result = await readLmStudioNativeChatResult(response, (chunk) =>
    chunks.push(chunk)
  );

  assert.deepEqual(chunks, ["Hello", ", world"]);
  assert.deepEqual(result, {
    output: [{ content: "Hello, world", type: "message" }],
  });
});

test("readLmStudioNativeChatResult does not invoke onDelta for terminal or non-message frames", async () => {
  const response = createStreamResponse([
    'data: {"type":"chat.start"}\n\n',
    'data: {"type":"unspecified","content":"noise"}\n\n',
    nativeChatEndFrame({ output: [{ content: "final", type: "message" }] }),
  ]);
  const chunks: string[] = [];

  await readLmStudioNativeChatResult(response, (chunk) => chunks.push(chunk));

  assert.deepEqual(chunks, []);
});

test("readLmStudioNativeChatResult ignores empty message.delta content", async () => {
  const response = createStreamResponse([
    'data: {"type":"message.delta","content":""}\n\n',
    'data: {"type":"message.delta","content":"ok"}\n\n',
    nativeChatEndFrame({ output: [{ content: "ok", type: "message" }] }),
  ]);
  const chunks: string[] = [];

  await readLmStudioNativeChatResult(response, (chunk) => chunks.push(chunk));

  assert.deepEqual(chunks, ["ok"]);
});

test("readLmStudioNativeChatResult invokes onDelta across chunk boundaries", async () => {
  const deltaFrame = 'data: {"type":"message.delta","content":"ABC"}\n\n';
  const endFrame = nativeChatEndFrame({
    output: [{ content: "ABC", type: "message" }],
  });
  const response = createStreamResponse([
    deltaFrame.slice(0, 12),
    deltaFrame.slice(12) + endFrame.slice(0, 10),
    endFrame.slice(10),
  ]);
  const chunks: string[] = [];

  await readLmStudioNativeChatResult(response, (chunk) => chunks.push(chunk));

  assert.deepEqual(chunks, ["ABC"]);
});

test("readLmStudioNativeChatResult routes reasoning.delta to onReasoning and message.delta to onDelta", async () => {
  const response = createStreamResponse([
    'data: {"type":"reasoning.start"}\n\n',
    'data: {"type":"reasoning.delta","content":"Let me"}\n\n',
    'data: {"type":"reasoning.delta","content":" think"}\n\n',
    'data: {"type":"message.delta","content":"Answer"}\n\n',
    nativeChatEndFrame({ output: [{ content: "Answer", type: "message" }] }),
  ]);
  const messageChunks: string[] = [];
  const reasoningChunks: string[] = [];

  await readLmStudioNativeChatResult(
    response,
    (chunk) => messageChunks.push(chunk),
    (chunk) => reasoningChunks.push(chunk)
  );

  // Reasoning is buffered and flushed as one chunk when message content starts.
  assert.deepEqual(reasoningChunks, ["Let me think"]);
  assert.deepEqual(messageChunks, ["Answer"]);
});

test("readLmStudioNativeChatResult streams reasoning even when no message.delta arrives", async () => {
  const response = createStreamResponse([
    'data: {"type":"reasoning.delta","content":""}\n\n',
    'data: {"type":"reasoning.delta","content":"step"}\n\n',
    nativeChatEndFrame({ output: [{ content: "step", type: "reasoning" }] }),
  ]);
  const messageChunks: string[] = [];
  const reasoningChunks: string[] = [];

  const result = await readLmStudioNativeChatResult(
    response,
    (chunk) => messageChunks.push(chunk),
    (chunk) => reasoningChunks.push(chunk)
  );

  assert.deepEqual(reasoningChunks, ["step"]);
  assert.deepEqual(messageChunks, []);
  assert.deepEqual(result, {
    output: [{ content: "step", type: "reasoning" }],
  });
});

test("readLmStudioNativeChatResult coalesces many tiny reasoning deltas into few chunks", async () => {
  const frames: string[] = [];
  for (let index = 0; index < 500; index += 1) {
    frames.push('data: {"type":"reasoning.delta","content":"ab"}\n\n');
  }
  frames.push(
    nativeChatEndFrame({ output: [{ content: "done", type: "message" }] })
  );
  const response = createStreamResponse(frames);
  const reasoningChunks: string[] = [];

  await readLmStudioNativeChatResult(response, undefined, (chunk) =>
    reasoningChunks.push(chunk)
  );

  // 500 deltas × 2 chars are buffered into a few coalesced chunks instead of
  // 500 separate "letter per line" messages, with no reasoning text lost.
  assert.ok(
    reasoningChunks.length > 0 && reasoningChunks.length < 10,
    `expected few coalesced chunks, got ${reasoningChunks.length}`
  );
  assert.equal(reasoningChunks.join(""), "ab".repeat(500));
});

test("readLmStudioNativeChatResult reports native tool_call.arguments frames", async () => {
  const response = createStreamResponse([
    'data: {"type":"tool_call.start","tool":"write_workflow_artifact"}\n\n',
    'data: {"type":"tool_call.arguments","tool":"write_workflow_artifact","arguments":{"relative_path":".codeai-hub/demo/Final_Description.md","content":"# Demo"},"provider_info":{"type":"ephemeral_mcp","server_label":"codeai"}}\n\n',
    nativeChatEndFrame({ output: [{ content: "written", type: "message" }] }),
  ]);
  const toolCalls: Array<{
    readonly arguments: Record<string, unknown>;
    readonly name: string;
    readonly providerInfo?: Record<string, unknown>;
  }> = [];

  await readLmStudioNativeChatResult(
    response,
    undefined,
    undefined,
    (toolCall) => toolCalls.push(toolCall)
  );

  assert.deepEqual(toolCalls, [
    {
      arguments: {
        content: "# Demo",
        relative_path: ".codeai-hub/demo/Final_Description.md",
      },
      name: "write_workflow_artifact",
      providerInfo: {
        server_label: "codeai",
        type: "ephemeral_mcp",
      },
    },
  ]);
});

test("readLmStudioNativeChatResult flushes reasoning before native tool calls", async () => {
  const response = createStreamResponse([
    'data: {"type":"reasoning.delta","content":"Need a file."}\n\n',
    'data: {"type":"tool_call.arguments","tool":"write_workflow_artifact","arguments":{"relative_path":".codeai-hub/demo/a.md","content":"ok"}}\n\n',
    nativeChatEndFrame({ output: [{ content: "done", type: "message" }] }),
  ]);
  const reasoningChunks: string[] = [];
  const toolCalls: string[] = [];

  await readLmStudioNativeChatResult(
    response,
    undefined,
    (chunk) => reasoningChunks.push(chunk),
    (toolCall) => toolCalls.push(toolCall.name)
  );

  assert.deepEqual(reasoningChunks, ["Need a file."]);
  assert.deepEqual(toolCalls, ["write_workflow_artifact"]);
});

test("readLmStudioNativeChatResult ignores malformed native tool call frames", async () => {
  const response = createStreamResponse([
    'data: {"type":"tool_call.arguments","tool":"","arguments":{"content":"x"}}\n\n',
    'data: {"type":"tool_call.arguments","tool":"write_workflow_artifact","arguments":"not-object"}\n\n',
    nativeChatEndFrame({ output: [{ content: "done", type: "message" }] }),
  ]);
  const toolCalls: string[] = [];

  await readLmStudioNativeChatResult(
    response,
    undefined,
    undefined,
    (toolCall) => toolCalls.push(toolCall.name)
  );

  assert.deepEqual(toolCalls, []);
});

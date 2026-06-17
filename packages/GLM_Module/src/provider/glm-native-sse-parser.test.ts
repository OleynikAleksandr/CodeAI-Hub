import assert from "node:assert/strict";
import test from "node:test";
import {
  parseGlmSseData,
  parseGlmUsage,
  readSseDataFrames,
} from "./glm-native-sse-parser";

async function* toAsyncIterable(
  chunks: readonly Uint8Array[]
): AsyncGenerator<Uint8Array> {
  for (const chunk of chunks) {
    yield await Promise.resolve(chunk);
  }
}

test("parseGlmSseData extracts reasoning, assistant content and usage", () => {
  const reasoning = parseGlmSseData(
    JSON.stringify({
      choices: [{ delta: { reasoning_content: "thinking" } }],
    })
  );
  assert.equal(reasoning?.reasoning, "thinking");

  const content = parseGlmSseData(
    JSON.stringify({
      choices: [{ delta: { content: "answer" } }],
    })
  );
  assert.equal(content?.content, "answer");

  const usage = parseGlmSseData(
    JSON.stringify({
      choices: [],
      usage: {
        completion_tokens: 8,
        completion_tokens_details: { reasoning_tokens: 3 },
        prompt_tokens: 5,
        prompt_tokens_details: { cached_tokens: 2 },
        total_tokens: 13,
      },
    })
  );
  assert.deepEqual(usage?.usage, {
    cachedTokens: 2,
    completionTokens: 8,
    promptTokens: 5,
    reasoningTokens: 3,
    totalTokens: 13,
  });
});

test("parseGlmUsage rejects incomplete usage payloads", () => {
  assert.equal(parseGlmUsage({ total_tokens: 1 }), null);
});

test("readSseDataFrames parses split data frames", async () => {
  const encoder = new TextEncoder();
  const body = [
    encoder.encode('data: {"a":'),
    encoder.encode("1}\n\n"),
    encoder.encode("event: done\ndata: [DONE]\n\n"),
  ];
  const frames: string[] = [];
  for await (const frame of readSseDataFrames(toAsyncIterable(body))) {
    frames.push(frame);
  }
  assert.deepEqual(frames, ['{"a":1}', "[DONE]"]);
});

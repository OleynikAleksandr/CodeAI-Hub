import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAssistantPartAccumulator,
  processOpenCodeSsePayload,
} from "./glm-opencode-sse-processor";
import { resolveOpenCodeContextWindowTokenLimit } from "./glm-opencode-turn-stream";

test("resolves supported OpenCode model context limits", () => {
  assert.equal(
    resolveOpenCodeContextWindowTokenLimit("kimi-for-coding/k2p7"),
    262_144
  );
  assert.equal(
    resolveOpenCodeContextWindowTokenLimit("zai-coding-plan/glm-5.2"),
    1_000_000
  );
  assert.equal(resolveOpenCodeContextWindowTokenLimit("unknown/model"), null);
});

test("emits token usage from assistant message updates", () => {
  const events: Array<{
    readonly data?: unknown;
    readonly tokenUsage?: unknown;
  }> = [];

  processOpenCodeSsePayload({
    accumulator: createAssistantPartAccumulator(),
    assistantMessageIds: new Set<string>(),
    contextWindowTokenLimit: 262_144,
    onEvent: (event) => events.push(event),
    payload: {
      properties: {
        info: {
          id: "msg_1",
          role: "assistant",
          sessionID: "ses_1",
          tokens: {
            input: 100,
            output: 20,
            reasoning: 5,
          },
        },
      },
      type: "message.updated",
    },
    remoteSessionId: "ses_1",
  });

  assert.deepEqual(events[0]?.tokenUsage, {
    limit: 262_144,
    used: 125,
  });
  assert.deepEqual(events[0]?.data, {
    kind: "token_usage",
    limit: 262_144,
    used: 125,
  });
});

test("emits monotonic token usage from step-finish parts", () => {
  const events: Array<{ readonly tokenUsage?: { readonly used?: unknown } }> =
    [];
  const accumulator = createAssistantPartAccumulator();
  const assistantMessageIds = new Set<string>(["msg_1"]);

  for (const tokens of [
    { input: 200, output: 25, reasoning: 10 },
    { input: 50, output: 5, reasoning: 0 },
  ]) {
    processOpenCodeSsePayload({
      accumulator,
      assistantMessageIds,
      contextWindowTokenLimit: 1_000_000,
      onEvent: (event) => events.push(event),
      payload: {
        properties: {
          part: {
            id: `part_${events.length}`,
            messageID: "msg_1",
            sessionID: "ses_1",
            tokens,
            type: "step-finish",
          },
        },
        type: "message.part.updated",
      },
      remoteSessionId: "ses_1",
    });
  }

  assert.equal(events.length, 2);
  assert.equal(events[0]?.tokenUsage?.used, 235);
  assert.equal(events[1]?.tokenUsage?.used, 235);
});

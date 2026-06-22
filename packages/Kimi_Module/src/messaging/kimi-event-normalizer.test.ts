import assert from "node:assert/strict";
import test from "node:test";
import { KimiWireEventNormalizer } from "./kimi-event-normalizer";

interface StreamEvent {
  readonly data?: {
    readonly contextUsage?: number;
    readonly phase?: string;
    readonly status?: string;
    readonly tokenUsage?: {
      readonly limit?: number;
      readonly used?: number;
    };
    readonly toolCallId?: string;
    readonly toolName?: string;
  };
  readonly type: string;
}

interface MessageEvent {
  readonly content?: string;
  readonly tag?: string;
  readonly type: string;
}

const asMessageEvent = (event: unknown): MessageEvent => {
  assert.ok(typeof event === "object" && event !== null);
  return event as MessageEvent;
};

const findStatusStreamEvent = (events: readonly unknown[]): StreamEvent => {
  const event = events.find(
    (candidate): candidate is StreamEvent =>
      typeof candidate === "object" &&
      candidate !== null &&
      (candidate as StreamEvent).type === "stream_event" &&
      (candidate as StreamEvent).data?.phase === "status_update"
  );
  assert.ok(event);
  return event;
};

const findStreamEvent = (
  events: readonly unknown[],
  phase: string
): StreamEvent => {
  const event = events.find(
    (candidate): candidate is StreamEvent =>
      typeof candidate === "object" &&
      candidate !== null &&
      (candidate as StreamEvent).type === "stream_event" &&
      (candidate as StreamEvent).data?.phase === phase
  );
  assert.ok(event);
  return event;
};

test("KimiWireEventNormalizer maps StatusUpdate context tokens to tokenUsage", () => {
  const normalizer = new KimiWireEventNormalizer();

  const statusEvent = findStatusStreamEvent(
    normalizer.normalize({
      payload: {
        context_tokens: 27_433,
        context_usage: 0.104_648_590_087_890_62,
        max_context_tokens: 262_144,
      },
      type: "StatusUpdate",
    })
  );

  assert.deepEqual(statusEvent.data?.tokenUsage, {
    limit: 262_144,
    used: 27_433,
  });
  assert.equal(statusEvent.data?.contextUsage, 0.104_648_590_087_890_62);
});

test("KimiWireEventNormalizer computes tokenUsage from context_usage when used tokens are absent", () => {
  const normalizer = new KimiWireEventNormalizer();

  const statusEvent = findStatusStreamEvent(
    normalizer.normalize({
      payload: {
        context_usage: "10.5",
        max_context_tokens: "1000",
      },
      type: "StatusUpdate",
    })
  );

  assert.deepEqual(statusEvent.data?.tokenUsage, {
    limit: 1000,
    used: 105,
  });
  assert.equal(statusEvent.data?.contextUsage, 0.105);
});

test("KimiWireEventNormalizer buffers ACP assistant chunks as one live message", () => {
  const normalizer = new KimiWireEventNormalizer();

  assert.deepEqual(
    normalizer.normalize({
      method: "session/update",
      params: {
        sessionId: "kimi-session",
        update: {
          content: { text: "visible ", type: "text" },
          sessionUpdate: "agent_message_chunk",
        },
      },
    }),
    []
  );
  assert.deepEqual(
    normalizer.normalize({
      method: "session/update",
      params: {
        sessionId: "kimi-session",
        update: {
          content: { text: "reply", type: "text" },
          sessionUpdate: "agent_message_chunk",
        },
      },
    }),
    []
  );

  const events = normalizer.normalize({ type: "TurnEnd" });
  const assistant = asMessageEvent(events[0]);

  assert.equal(assistant.type, "assistant");
  assert.equal(assistant.content, "visible reply");
  assert.equal(assistant.tag, "live");
  assert.equal(events[1]?.type, "turn_completed");
});

test("KimiWireEventNormalizer buffers ACP thought chunks before assistant", () => {
  const normalizer = new KimiWireEventNormalizer();

  assert.deepEqual(
    normalizer.normalize({
      method: "session/update",
      params: {
        sessionId: "kimi-session",
        update: {
          content: { text: "internal ", type: "text" },
          sessionUpdate: "agent_thought_chunk",
        },
      },
    }),
    []
  );
  const events = normalizer.normalize({
    method: "session/update",
    params: {
      sessionId: "kimi-session",
      update: {
        content: { text: "trace", type: "text" },
        sessionUpdate: "agent_thought_chunk",
      },
    },
  });
  assert.deepEqual(events, []);
  const thought = asMessageEvent(
    normalizer.normalize({
      method: "session/update",
      params: {
        sessionId: "kimi-session",
        update: {
          content: { text: "visible reply", type: "text" },
          messageId: "message-1",
          sessionUpdate: "agent_message_chunk",
        },
      },
    })[0]
  );

  assert.equal(thought.type, "thinking");
  assert.equal(thought.content, "internal trace");
  assert.equal(thought.tag, "thinking");
});

test("KimiWireEventNormalizer maps long ACP thought chunk immediately", () => {
  const normalizer = new KimiWireEventNormalizer();
  const thought = asMessageEvent(
    normalizer.normalize({
      method: "session/update",
      params: {
        sessionId: "kimi-session",
        update: {
          content: { text: "x".repeat(900), type: "text" },
          sessionUpdate: "agent_thought_chunk",
        },
      },
    })[0]
  );

  assert.equal(thought.type, "thinking");
  assert.equal(thought.content, "x".repeat(900));
  assert.equal(thought.tag, "thinking");
});

test("KimiWireEventNormalizer maps ACP tool and usage updates", () => {
  const normalizer = new KimiWireEventNormalizer();

  const toolEvent = findStreamEvent(
    normalizer.normalize({
      method: "session/update",
      params: {
        sessionId: "kimi-session",
        update: {
          sessionUpdate: "tool_call_update",
          status: "completed",
          title: "Edit file",
          toolCallId: "tool-1",
        },
      },
    }),
    "tool_result"
  );
  const statusEvent = findStatusStreamEvent(
    normalizer.normalize({
      method: "session/update",
      params: {
        sessionId: "kimi-session",
        update: {
          sessionUpdate: "usage_update",
          size: 1000,
          used: 125,
        },
      },
    })
  );

  assert.equal(toolEvent.data?.status, "completed");
  assert.equal(toolEvent.data?.toolCallId, "tool-1");
  assert.equal(toolEvent.data?.toolName, "Edit file");
  assert.deepEqual(statusEvent.data?.tokenUsage, {
    limit: 1000,
    used: 125,
  });
  assert.equal(statusEvent.data?.contextUsage, 0.125);
});

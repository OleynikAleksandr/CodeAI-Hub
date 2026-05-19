import assert from "node:assert/strict";
import test from "node:test";
import { KimiWireEventNormalizer } from "./kimi-event-normalizer";

interface StreamEvent {
  readonly data?: {
    readonly contextUsage?: number;
    readonly phase?: string;
    readonly tokenUsage?: {
      readonly limit?: number;
      readonly used?: number;
    };
  };
  readonly type: string;
}

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

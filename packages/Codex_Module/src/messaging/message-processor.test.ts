import assert from "node:assert/strict";
import test from "node:test";
import { waitForNextResultWithIdlePulses } from "./message-processor";

const STREAM_FAILED_RE = /stream failed/;

test("waitForNextResultWithIdlePulses resolves without idle callback when next event is immediate", async () => {
  const idlePulses: number[] = [];

  const result = await waitForNextResultWithIdlePulses({
    nextPromise: Promise.resolve("done"),
    idleTimeoutMs: 10,
    onIdle: ({ idleCount }) => {
      idlePulses.push(idleCount);
    },
  });

  assert.equal(result, "done");
  assert.deepEqual(idlePulses, []);
});

test("waitForNextResultWithIdlePulses keeps waiting across idle pulses until an event arrives", async () => {
  const idlePulses: number[] = [];

  const result = await waitForNextResultWithIdlePulses({
    nextPromise: new Promise<string>((resolve) => {
      setTimeout(() => resolve("late-event"), 35);
    }),
    idleTimeoutMs: 10,
    onIdle: ({ idleCount }) => {
      idlePulses.push(idleCount);
    },
  });

  assert.equal(result, "late-event");
  assert.deepEqual(idlePulses, [1, 2, 3]);
});

test("waitForNextResultWithIdlePulses preserves generator failures", async () => {
  await assert.rejects(
    () =>
      waitForNextResultWithIdlePulses({
        nextPromise: Promise.reject(new Error("stream failed")),
        idleTimeoutMs: 10,
        onIdle: () => {
          // No-op: this branch should reject before any idle pulse matters.
        },
      }),
    STREAM_FAILED_RE
  );
});

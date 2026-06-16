import assert from "node:assert/strict";
import test from "node:test";
import type { SessionMessage } from "../../../../types/session";

interface BrowserLikeGlobal {
  postMessage: (...args: unknown[]) => void;
  [key: string]: unknown;
}

interface TestGlobalScope {
  window: BrowserLikeGlobal;
  [key: string]: unknown;
}

const ensureBrowserLikeGlobals = (): void => {
  const globalScope = globalThis as unknown as TestGlobalScope;
  if (!globalScope.window) {
    globalScope.window = globalScope as unknown as BrowserLikeGlobal;
  }
  if (typeof globalScope.window.postMessage !== "function") {
    globalScope.window.postMessage = () => {
      // noop
    };
  }
};

const createThinkingMessage = (): SessionMessage => ({
  content: "Thinking",
  createdAt: 1,
  id: "message-1",
  role: "assistant",
  tag: "thinking",
});

test("resolveThinkingInputConnectionState keeps active thinking turns locked", async () => {
  ensureBrowserLikeGlobals();
  const { resolveThinkingInputConnectionState } = await import(
    "./session-view"
  );

  assert.equal(
    resolveThinkingInputConnectionState(
      "idle",
      createThinkingMessage(),
      "ready"
    ),
    "running"
  );
});

test("resolveThinkingInputConnectionState unlocks stopped stale thinking turns", async () => {
  ensureBrowserLikeGlobals();
  const { resolveThinkingInputConnectionState } = await import(
    "./session-view"
  );
  const thinkingMessage = createThinkingMessage();

  assert.equal(
    resolveThinkingInputConnectionState("idle", thinkingMessage, "pending"),
    "idle"
  );
  assert.equal(
    resolveThinkingInputConnectionState("idle", thinkingMessage, "failed"),
    "idle"
  );
  assert.equal(
    resolveThinkingInputConnectionState("idle", thinkingMessage, null),
    "idle"
  );
});

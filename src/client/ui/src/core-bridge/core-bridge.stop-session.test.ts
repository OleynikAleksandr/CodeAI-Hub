import assert from "node:assert/strict";
import test from "node:test";

interface BrowserLikeGlobal {
  __CODEAI_PM_STOP_SESSION__?: (sessionId: string) => void;
  addEventListener: (...args: unknown[]) => void;
  clearTimeout: typeof clearTimeout;
  postMessage: (...args: unknown[]) => void;
  removeEventListener: (...args: unknown[]) => void;
  setTimeout: typeof setTimeout;
  [key: string]: unknown;
}

const ensureBrowserLikeGlobals = (): BrowserLikeGlobal => {
  const globalScope = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis & BrowserLikeGlobal;
  };
  if (!globalScope.window) {
    globalScope.window = globalScope as unknown as Window &
      typeof globalThis &
      BrowserLikeGlobal;
  }
  if (typeof globalScope.window.postMessage !== "function") {
    globalScope.window.postMessage = () => {
      // noop
    };
  }
  if (typeof globalScope.window.setTimeout !== "function") {
    globalScope.window.setTimeout = setTimeout;
  }
  if (typeof globalScope.window.clearTimeout !== "function") {
    globalScope.window.clearTimeout = clearTimeout;
  }
  if (typeof globalScope.window.addEventListener !== "function") {
    globalScope.window.addEventListener = () => {
      // noop
    };
  }
  if (typeof globalScope.window.removeEventListener !== "function") {
    globalScope.window.removeEventListener = () => {
      // noop
    };
  }
  return globalScope.window;
};

test("stopSession delegates to Project Manager bridge when available", async () => {
  const windowScope = ensureBrowserLikeGlobals();
  let receivedSessionId: string | null = null;
  windowScope.__CODEAI_PM_STOP_SESSION__ = (sessionId: string) => {
    receivedSessionId = sessionId;
  };

  const { stopSession } = await import("./core-bridge");
  stopSession("pm-session-1");

  assert.equal(receivedSessionId, "pm-session-1");

  windowScope.__CODEAI_PM_STOP_SESSION__ = undefined;
});

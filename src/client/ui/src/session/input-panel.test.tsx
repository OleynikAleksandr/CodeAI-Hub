import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

interface BrowserLikeGlobal {
  addEventListener: (...args: unknown[]) => void;
  clearTimeout: typeof clearTimeout;
  postMessage: (...args: unknown[]) => void;
  removeEventListener: (...args: unknown[]) => void;
  setTimeout: typeof setTimeout;
  [key: string]: unknown;
}

interface TestGlobalScope {
  cancelAnimationFrame: (id: number) => void;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
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
  if (typeof globalScope.requestAnimationFrame !== "function") {
    globalScope.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const timeout = setTimeout(() => callback(0), 0);
      return timeout as unknown as number;
    };
  }
};

const renderInputPanel = async (overrides?: {
  readonly connectionState?: "idle" | "running" | "blocked";
  readonly continuityLockActive?: boolean;
  readonly continuityErrorCopy?: string | null;
  readonly isQueued?: boolean;
}): Promise<string> => {
  ensureBrowserLikeGlobals();
  (globalThis as typeof globalThis & { React?: unknown }).React = await import(
    "react"
  );
  const InputPanel = (await import("./input-panel")).default;
  return renderToStaticMarkup(
    createElement(InputPanel, {
      draft: "",
      connectionState: "idle",
      continuityLockActive: false,
      continuityErrorCopy: null,
      isQueued: false,
      onSubmit: () => {
        // noop
      },
      ...overrides,
    })
  );
};

test("InputPanel shows continuity placeholder when continuity lock is active", async () => {
  const html = await renderInputPanel({
    connectionState: "idle",
    continuityLockActive: true,
  });

  assert.equal(
    html.includes("Agent is resuming your session… Please wait."),
    true
  );
});

test("InputPanel keeps fieldset disabled while continuity lock is active", async () => {
  const html = await renderInputPanel({
    connectionState: "idle",
    continuityLockActive: true,
  });

  assert.equal(html.includes("disabled"), true);
});

test("InputPanel prioritizes queued placeholder over continuity placeholder", async () => {
  const html = await renderInputPanel({
    connectionState: "blocked",
    continuityLockActive: true,
    isQueued: true,
  });

  assert.equal(
    html.includes("Message queued. Sending as soon as it is ready…"),
    true
  );
  assert.equal(
    html.includes("Agent is resuming your session… Please wait."),
    false
  );
});

test("InputPanel disables fieldset while running", async () => {
  const html = await renderInputPanel({
    connectionState: "running",
  });

  assert.equal(html.includes("disabled"), true);
  assert.equal(html.includes("Agent is working… Please wait."), true);
  assert.equal(
    html.includes("Agent is resuming your session… Please wait."),
    false
  );
});

test("InputPanel keeps read-only mode when connection stays blocked after continuity flag clears", async () => {
  const html = await renderInputPanel({
    connectionState: "blocked",
    continuityLockActive: false,
  });

  assert.equal(html.includes("disabled"), true);
  assert.equal(
    html.includes("Agent is resuming your session… Please wait."),
    true
  );
});

test("InputPanel enables fieldset when continuity unlock is resolved", async () => {
  const html = await renderInputPanel({
    connectionState: "idle",
    continuityLockActive: false,
    isQueued: false,
  });

  assert.equal(html.includes("disabled"), false);
  assert.equal(
    html.includes("Agent is resuming your session… Please wait."),
    false
  );
});

test("InputPanel keeps handoff lock until final reviewer snapshot unlocks it", async () => {
  const handoffHtml = await renderInputPanel({
    connectionState: "blocked",
    continuityLockActive: true,
  });
  const reviewerCompletedHtml = await renderInputPanel({
    connectionState: "idle",
    continuityLockActive: false,
  });

  assert.equal(handoffHtml.includes("disabled"), true);
  assert.equal(reviewerCompletedHtml.includes("disabled"), false);
});

test("InputPanel stays locked on post-answer continuity trigger when idle + continuityLockActive=true", async () => {
  const answerDeliveredHtml = await renderInputPanel({
    connectionState: "idle",
    continuityLockActive: false,
    isQueued: false,
  });
  const postAnswerContinuityHtml = await renderInputPanel({
    connectionState: "idle",
    continuityLockActive: true,
    isQueued: false,
  });

  assert.equal(answerDeliveredHtml.includes("disabled"), false);
  assert.equal(postAnswerContinuityHtml.includes("disabled"), true);
  assert.equal(
    postAnswerContinuityHtml.includes(
      "Agent is resuming your session… Please wait."
    ),
    true
  );
});

test("InputPanel always renders hint footer in DOM even when locked", async () => {
  const lockedHtml = await renderInputPanel({
    connectionState: "running",
    continuityLockActive: false,
  });
  const unlockedHtml = await renderInputPanel({
    connectionState: "idle",
    continuityLockActive: false,
  });

  assert.equal(
    lockedHtml.includes("Press Enter to send, Shift+Enter for a new line"),
    true,
    "Hint footer must be in DOM when locked (visibility:hidden)"
  );
  assert.equal(
    unlockedHtml.includes("Press Enter to send, Shift+Enter for a new line"),
    true,
    "Hint footer must be in DOM when unlocked"
  );
  assert.equal(
    lockedHtml.includes("visibility:hidden"),
    true,
    "Hint footer must be hidden via visibility when locked"
  );
});

test("InputPanel shows continuity error placeholder when unlocked", async () => {
  const html = await renderInputPanel({
    connectionState: "idle",
    continuityLockActive: false,
    continuityErrorCopy:
      "ack_timeout: Timed out waiting for continuity create-report ack",
    isQueued: false,
  });

  assert.equal(html.includes("disabled"), false);
  assert.equal(
    html.includes(
      "Continuity failed: ack_timeout: Timed out waiting for continuity create-report ack"
    ),
    true
  );
});

test("InputPanel does not override working placeholder with continuity error", async () => {
  const html = await renderInputPanel({
    connectionState: "running",
    continuityLockActive: false,
    continuityErrorCopy:
      "report_timeout: Timed out waiting for continuity report",
    isQueued: false,
  });

  assert.equal(html.includes("Agent is working… Please wait."), true);
  assert.equal(html.includes("Continuity failed:"), false);
});

test("InputPanel does not restore resuming placeholder after resume_ready and first normal turn", async () => {
  const bootstrapLockHtml = await renderInputPanel({
    connectionState: "blocked",
    continuityLockActive: true,
    isQueued: false,
  });
  const resumeReadyHtml = await renderInputPanel({
    connectionState: "idle",
    continuityLockActive: false,
    isQueued: false,
  });
  const firstNormalTurnCompletedHtml = await renderInputPanel({
    connectionState: "idle",
    continuityLockActive: false,
    isQueued: false,
  });

  assert.equal(
    bootstrapLockHtml.includes("Agent is resuming your session… Please wait."),
    true
  );
  assert.equal(
    resumeReadyHtml.includes("Agent is resuming your session… Please wait."),
    false
  );
  assert.equal(
    firstNormalTurnCompletedHtml.includes(
      "Agent is resuming your session… Please wait."
    ),
    false
  );
  assert.equal(firstNormalTurnCompletedHtml.includes("disabled"), false);
});

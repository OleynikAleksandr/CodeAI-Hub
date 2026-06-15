import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProviderStackId } from "../../../../types/provider";
import type {
  SessionMessage,
  SessionRecord,
  SessionSnapshot,
} from "../../../../types/session";

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
  readonly resumingLockActive?: boolean;
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

const createMessage = (
  id: string,
  role: SessionMessage["role"],
  content: string,
  tag?: string
): SessionMessage => ({
  id,
  role,
  content,
  createdAt: Number(id),
  ...(tag ? { tag } : {}),
});

const renderSessionView = async (
  messages: readonly SessionMessage[]
): Promise<string> => {
  ensureBrowserLikeGlobals();
  (globalThis as typeof globalThis & { React?: unknown }).React = await import(
    "react"
  );
  const SessionView = (await import("./session-view")).default;
  const binding = { providerSessionId: null, status: "ready" as const };
  const session: SessionRecord = {
    id: "session-1",
    title: "Session",
    providerIds: ["claudeCodeCli"],
    workspacePath: "/workspace",
    stage: null,
    runSlug: null,
    sessionKind: null,
    createdAt: 1,
    binding,
  };
  const snapshot: SessionSnapshot = {
    binding,
    draft: "",
    messages,
    status: {
      connectionState: "idle",
      providerSummary: "Claude",
      tokenUsage: { used: 0, limit: 1 },
      updatedAt: 1,
    },
    todos: [],
  };

  return renderToStaticMarkup(
    createElement(SessionView, {
      activeSessionId: session.id,
      coreConnectionStatus: "ready",
      onCloseSession: () => {
        // noop
      },
      onSelectSession: () => {
        // noop
      },
      onSendMessage: () => {
        // noop
      },
      providerLabels: new Map<ProviderStackId, string>(),
      sessions: [session],
      showEmptyState: true,
      snapshots: { [session.id]: snapshot },
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

test("SessionView locks input while idle snapshot ends with thinking", async () => {
  const thinkingHtml = await renderSessionView([
    createMessage("1", "user", "Build it"),
    createMessage("2", "assistant", "Thinking", "thinking"),
  ]);
  const finalHtml = await renderSessionView([
    createMessage("1", "user", "Build it"),
    createMessage("2", "assistant", "Thinking", "thinking"),
    createMessage("3", "assistant", "Done"),
  ]);

  assert.equal(thinkingHtml.includes("<fieldset disabled"), true);
  assert.equal(thinkingHtml.includes("Agent is working… Please wait."), true);
  assert.equal(finalHtml.includes("<fieldset disabled"), false);
});

test("InputPanel keeps working copy when connection stays blocked after continuity flag clears", async () => {
  const html = await renderInputPanel({
    connectionState: "blocked",
    continuityLockActive: false,
  });

  assert.equal(html.includes("disabled"), true);
  assert.equal(html.includes("Agent is working… Please wait."), true);
  assert.equal(
    html.includes("Agent is resuming your session… Please wait."),
    false
  );
});

test("InputPanel maps generic blocked waits to working copy", async () => {
  const html = await renderInputPanel({
    connectionState: "blocked",
    continuityLockActive: false,
  });

  assert.equal(html.includes("Agent is working… Please wait."), true);
  assert.equal(
    html.includes("Agent is resuming your session… Please wait."),
    false
  );
});

test("InputPanel maps non-resume lock waits to working copy", async () => {
  const html = await renderInputPanel({
    connectionState: "blocked",
    continuityLockActive: true,
    resumingLockActive: false,
  });

  assert.equal(html.includes("Agent is working… Please wait."), true);
  assert.equal(
    html.includes("Agent is resuming your session… Please wait."),
    false
  );
});

test("InputPanel keeps resuming copy for explicit resume locks", async () => {
  const html = await renderInputPanel({
    connectionState: "blocked",
    continuityLockActive: true,
    resumingLockActive: true,
  });

  assert.equal(html.includes("Agent is working… Please wait."), false);
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

test("SessionView reserves resume copy for actual rollover resume locks", async () => {
  ensureBrowserLikeGlobals();
  (globalThis as typeof globalThis & { React?: unknown }).React = await import(
    "react"
  );
  const { isSessionResumeLockReason } = await import("./session-view");

  assert.equal(isSessionResumeLockReason("context_check_pending"), false);
  assert.equal(isSessionResumeLockReason("no_rollover_needed"), false);
  assert.equal(isSessionResumeLockReason("resume_ready"), false);
  assert.equal(isSessionResumeLockReason("threshold_reached"), true);
  assert.equal(isSessionResumeLockReason("report_in_progress"), true);
  assert.equal(isSessionResumeLockReason("resume_bootstrap"), true);
});

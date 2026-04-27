import assert from "node:assert/strict";
import test from "node:test";
import {
  type AppServerSessionState,
  CodexAppServerEventRouter,
} from "./codex-app-server-event-router";

interface EmittedEvent {
  readonly payload: unknown;
  readonly threadId: string;
}

const createSessionState = (): AppServerSessionState => ({
  activeTurnId: null,
  assistantTextByItemId: new Map<string, string>(),
  listeners: new Set<(payload: unknown) => void>(),
  reasoningSummariesByItemId: new Map<string, string[]>(),
  workspacePath: "/tmp/codex-reasoning-test",
});

const createRouterHarness = () => {
  const emitted: EmittedEvent[] = [];
  const states = new Map<string, AppServerSessionState>();
  const router = new CodexAppServerEventRouter({
    emit: (threadId, payload) => {
      emitted.push({ payload, threadId });
    },
    ensureSessionState: (threadId) => {
      const existing = states.get(threadId);
      if (existing) {
        return existing;
      }
      const state = createSessionState();
      states.set(threadId, state);
      return state;
    },
    listThreadIds: () => states.keys(),
  });
  return {
    emitted,
    ensureThread: (threadId: string) => {
      if (!states.has(threadId)) {
        states.set(threadId, createSessionState());
      }
    },
    router,
  };
};

const collectDialogMessages = (events: EmittedEvent[]) =>
  events.map(({ payload, threadId }) => {
    const record = payload as Record<string, unknown>;
    assert.equal(record.type, "dialog_message");
    return {
      content: record.content,
      role: record.role,
      tag: record.tag,
      threadId,
      uuid: record.uuid,
    };
  });

test("CodexAppServerEventRouter streams completed reasoning summary paragraphs before item/completed", () => {
  const { emitted, router } = createRouterHarness();

  router.handleNotification("item/reasoning/summaryPartAdded", {
    itemId: "reasoning-1",
    summaryIndex: 0,
    threadId: "thread-1",
  });
  router.handleNotification("item/reasoning/summaryTextDelta", {
    delta: "**Draft heading**",
    itemId: "reasoning-1",
    summaryIndex: 0,
    threadId: "thread-1",
  });

  assert.equal(emitted.length, 0);
  router.handleNotification("item/reasoning/summaryPartAdded", {
    itemId: "reasoning-1",
    summaryIndex: 1,
    threadId: "thread-1",
  });
  assert.deepEqual(collectDialogMessages(emitted), [
    {
      content: "**Draft heading**",
      role: "assistant",
      tag: "thinking",
      threadId: "thread-1",
      uuid: "reasoning-1::summary-block::0",
    },
  ]);

  router.handleNotification("item/completed", {
    item: {
      id: "reasoning-1",
      summary: [
        "**Exploring model synchronization**\n\nBody one.",
        "**Crafting concise questions**\n\nBody two.",
      ],
      type: "reasoning",
    },
    threadId: "thread-1",
  });

  assert.deepEqual(collectDialogMessages(emitted), [
    {
      content: "**Draft heading**",
      role: "assistant",
      tag: "thinking",
      threadId: "thread-1",
      uuid: "reasoning-1::summary-block::0",
    },
    {
      content: "**Crafting concise questions**\n\nBody two.",
      role: "assistant",
      tag: "thinking",
      threadId: "thread-1",
      uuid: "reasoning-1::summary-block::1",
    },
  ]);
});

test("CodexAppServerEventRouter falls back to accumulated summary parts when item.summary is absent", () => {
  const { emitted, router } = createRouterHarness();

  router.handleNotification("item/reasoning/summaryPartAdded", {
    itemId: "reasoning-2",
    summaryIndex: 0,
    threadId: "thread-2",
  });
  router.handleNotification("item/reasoning/summaryTextDelta", {
    delta: "**Evaluating downstream review**\n\nBody one.",
    itemId: "reasoning-2",
    summaryIndex: 0,
    threadId: "thread-2",
  });
  assert.equal(emitted.length, 0);
  router.handleNotification("item/reasoning/summaryPartAdded", {
    itemId: "reasoning-2",
    summaryIndex: 1,
    threadId: "thread-2",
  });
  assert.deepEqual(collectDialogMessages(emitted), [
    {
      content: "**Evaluating downstream review**\n\nBody one.",
      role: "assistant",
      tag: "thinking",
      threadId: "thread-2",
      uuid: "reasoning-2::summary-block::0",
    },
  ]);
  router.handleNotification("item/reasoning/summaryTextDelta", {
    delta: "**Considering product structure**\n\nBody two.",
    itemId: "reasoning-2",
    summaryIndex: 1,
    threadId: "thread-2",
  });

  router.handleNotification("item/completed", {
    item: {
      content: [],
      id: "reasoning-2",
      type: "reasoning",
    },
    threadId: "thread-2",
  });

  assert.deepEqual(collectDialogMessages(emitted), [
    {
      content: "**Evaluating downstream review**\n\nBody one.",
      role: "assistant",
      tag: "thinking",
      threadId: "thread-2",
      uuid: "reasoning-2::summary-block::0",
    },
    {
      content: "**Considering product structure**\n\nBody two.",
      role: "assistant",
      tag: "thinking",
      threadId: "thread-2",
      uuid: "reasoning-2::summary-block::1",
    },
  ]);
});

test("CodexAppServerEventRouter falls back to accumulated raw text when no summary blocks are available", () => {
  const { emitted, router } = createRouterHarness();

  router.handleNotification("item/reasoning/textDelta", {
    delta: "Single fallback reasoning block.",
    itemId: "reasoning-3",
    threadId: "thread-3",
  });

  assert.equal(emitted.length, 0);

  router.handleNotification("item/completed", {
    item: {
      id: "reasoning-3",
      type: "reasoning",
    },
    threadId: "thread-3",
  });

  assert.deepEqual(collectDialogMessages(emitted), [
    {
      content: "Single fallback reasoning block.",
      role: "assistant",
      tag: "thinking",
      threadId: "thread-3",
      uuid: "reasoning-3::summary-block::0",
    },
  ]);
});

test("CodexAppServerEventRouter preserves commentary as a tagged non-terminal dialog message", () => {
  const { emitted, router } = createRouterHarness();

  router.handleNotification("item/agentMessage/delta", {
    delta: "Inspecting the active files before I answer.",
    itemId: "agent-1",
    threadId: "thread-4",
  });

  router.handleNotification("item/completed", {
    item: {
      id: "agent-1",
      phase: "commentary",
      type: "agentMessage",
    },
    threadId: "thread-4",
  });

  router.handleNotification("item/completed", {
    item: {
      id: "agent-2",
      phase: "final_answer",
      text: "Final assistant answer.",
      type: "agentMessage",
    },
    threadId: "thread-4",
  });

  assert.deepEqual(collectDialogMessages(emitted), [
    {
      content: "Inspecting the active files before I answer.",
      role: "assistant",
      tag: "commentary",
      threadId: "thread-4",
      uuid: "agent-1",
    },
    {
      content: "Final assistant answer.",
      role: "assistant",
      tag: undefined,
      threadId: "thread-4",
      uuid: "agent-2",
    },
  ]);
});

test("CodexAppServerEventRouter normalizes numeric resetsAt values from account rate limits", () => {
  const { emitted, ensureThread, router } = createRouterHarness();
  ensureThread("thread-usage-a");
  ensureThread("thread-usage-b");

  const payload = router.registerUsageLimitsSnapshot({
    primary: {
      usedPercent: 41,
      resetsAt: 1_776_855_314,
    },
    secondary: {
      usedPercent: 66,
      resetsAt: "1777455314000",
    },
  });

  assert.equal(
    payload?.usageLimits?.currentSession?.resetsAt,
    new Date(1_776_855_314 * 1000).toISOString()
  );
  assert.equal(
    payload?.usageLimits?.currentWeekAllModels?.resetsAt,
    new Date(1_777_455_314_000).toISOString()
  );
  const usageEvents = emitted.filter(({ payload: eventPayload }) => {
    const record = eventPayload as Record<string, unknown>;
    return record.type === "stream_event";
  });
  assert.equal(usageEvents.length, 2);
  assert.equal(
    (
      usageEvents[0]?.payload as {
        readonly usageLimits?: {
          readonly currentSession?: { readonly resetsAt?: string | null };
        };
      }
    ).usageLimits?.currentSession?.resetsAt,
    new Date(1_776_855_314 * 1000).toISOString()
  );
});

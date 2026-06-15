import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderStackId } from "../../../../types/provider";
import type {
  SessionMessage,
  SessionRecord,
  SessionSnapshot,
} from "../../../../types/session";
import {
  createDefaultSettings,
  type Settings,
} from "../components/settings/settings-state-model";
import { resolveSessionThinkingDisplayEnabled } from "./helpers";
import { resolveVirtualConversationMessages } from "./session-view-helpers";

const createMessage = (
  id: string,
  role: SessionMessage["role"],
  content: string,
  tag?: string,
  visibilityAtEmission?: SessionMessage["visibilityAtEmission"]
): SessionMessage => ({
  id,
  role,
  content,
  createdAt: Number(id),
  ...(tag ? { tag } : {}),
  ...(visibilityAtEmission ? { visibilityAtEmission } : {}),
});

const createSession = (
  providerId: ProviderStackId,
  messages: readonly SessionMessage[],
  continuationParentId: string | null = null,
  sessionId?: string
): {
  readonly session: SessionRecord;
  readonly snapshot: SessionSnapshot;
} => {
  const binding = { providerSessionId: null, status: "ready" as const };
  const session: SessionRecord = {
    id: sessionId ?? `${providerId}-session`,
    ...(continuationParentId ? { continuationParentId } : {}),
    title: "Session",
    providerIds: [providerId],
    workspacePath: "/workspace",
    stage: null,
    runSlug: null,
    sessionKind: null,
    createdAt: Date.now(),
    binding,
  };
  const snapshot: SessionSnapshot = {
    binding,
    draft: "",
    messages: [...messages],
    status: {
      connectionState: "idle",
      providerSummary: providerId,
      tokenUsage: { used: 0, limit: 1 },
      updatedAt: Date.now(),
    },
    todos: [],
  };

  return { session, snapshot };
};

const buildDisabledSettings = (): Settings => {
  const defaults = createDefaultSettings();
  return {
    ...defaults,
    providers: {
      ...defaults.providers,
      claude: {
        ...defaults.providers.claude,
        thinkingDisplaySyncEnabled: false,
      },
      codex: {
        ...defaults.providers.codex,
        reasoningSummaryEnabled: false,
      },
      gemini: {
        ...defaults.providers.gemini,
        thinkingDisplaySyncEnabled: false,
      },
      kimi: {
        autoUpdate: defaults.providers.kimi?.autoUpdate ?? { enabled: false },
        defaultModel: defaults.providers.kimi?.defaultModel ?? "kimi-k2.7-code",
        thinkingDisplaySyncEnabled: false,
      },
    },
  };
};

test("resolveSessionThinkingDisplayEnabled follows provider-specific settings", () => {
  const settings = buildDisabledSettings();

  assert.equal(
    resolveSessionThinkingDisplayEnabled({
      providerId: "claudeCodeCli",
      settings,
    }),
    false
  );
  assert.equal(
    resolveSessionThinkingDisplayEnabled({
      providerId: "codexCli",
      settings,
    }),
    false
  );
  assert.equal(
    resolveSessionThinkingDisplayEnabled({
      providerId: "geminiCli",
      settings,
    }),
    false
  );
  assert.equal(
    resolveSessionThinkingDisplayEnabled({
      providerId: "kimiCode",
      settings,
    }),
    false
  );
  assert.equal(
    resolveSessionThinkingDisplayEnabled({
      providerId: null,
      settings: null,
    }),
    true
  );
});

test("resolveVirtualConversationMessages hides thinking bubbles only when disabled", () => {
  const messages = [
    createMessage("1", "thinking", "Hidden reasoning"),
    createMessage("2", "assistant", "Visible answer"),
    createMessage("3", "assistant", "Tagged reasoning", "thinking"),
  ];
  const { session, snapshot } = createSession("claudeCodeCli", messages);

  const hidden = resolveVirtualConversationMessages({
    activeSessionId: session.id,
    activeSession: snapshot,
    continuationChain: [session],
    showThinkingMessages: false,
    snapshots: { [session.id]: snapshot },
  });
  const visible = resolveVirtualConversationMessages({
    activeSessionId: session.id,
    activeSession: snapshot,
    continuationChain: [session],
    showThinkingMessages: true,
    snapshots: { [session.id]: snapshot },
  });

  assert.deepEqual(
    hidden.map((message) => message.id),
    ["2"]
  );
  assert.deepEqual(
    visible.map((message) => message.id),
    ["1", "2", "3"]
  );
});

test("emission-time hidden thinking stays hidden even when toggle is on", () => {
  const messages = [
    createMessage("1", "user", "Prompt"),
    createMessage("2", "assistant", "Hidden-at-emit", "thinking", "hidden"),
    createMessage("3", "assistant", "Final answer"),
  ];
  const { session, snapshot } = createSession("claudeCodeCli", messages);

  const visible = resolveVirtualConversationMessages({
    activeSessionId: session.id,
    activeSession: snapshot,
    continuationChain: [session],
    showThinkingMessages: true,
    snapshots: { [session.id]: snapshot },
  });

  assert.deepEqual(
    visible.map((message) => message.id),
    ["1", "3"]
  );
});

test("emission-time visible thinking stays visible even when toggle is off", () => {
  const messages = [
    createMessage("1", "user", "Prompt"),
    createMessage("2", "assistant", "Visible-at-emit", "thinking", "visible"),
    createMessage("3", "assistant", "Final answer"),
  ];
  const { session, snapshot } = createSession("claudeCodeCli", messages);

  const visible = resolveVirtualConversationMessages({
    activeSessionId: session.id,
    activeSession: snapshot,
    continuationChain: [session],
    showThinkingMessages: false,
    snapshots: { [session.id]: snapshot },
  });

  assert.deepEqual(
    visible.map((message) => message.id),
    ["1", "2", "3"]
  );
});

test("resolveVirtualConversationMessages keeps continuation thinking visible when enabled", () => {
  const firstMessages = [
    createMessage("1", "user", "First prompt"),
    createMessage("2", "assistant", "First thinking", "thinking"),
    createMessage("3", "assistant", "First answer"),
  ];
  const secondMessages = [
    createMessage("4", "user", "Second prompt"),
    createMessage("5", "assistant", "Second thinking", "thinking"),
    createMessage("6", "assistant", "Second answer"),
  ];
  const first = createSession("claudeCodeCli", firstMessages);
  const second = createSession(
    "claudeCodeCli",
    secondMessages,
    first.session.id,
    "claudeCodeCli-second-session"
  );

  const visible = resolveVirtualConversationMessages({
    activeSessionId: second.session.id,
    activeSession: second.snapshot,
    continuationChain: [first.session, second.session],
    showThinkingMessages: true,
    snapshots: {
      [first.session.id]: first.snapshot,
      [second.session.id]: second.snapshot,
    },
  });

  assert.deepEqual(
    visible.map((message) => message.id),
    ["1", "2", "3", "4", "5", "6"]
  );
});

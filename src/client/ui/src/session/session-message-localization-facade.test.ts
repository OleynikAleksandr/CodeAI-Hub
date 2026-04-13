import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSnapshot } from "../../../../types/session";
import type { SessionSnapshots } from "./helpers";
import { SessionMessageLocalizationFacade } from "./session-message-localization-facade";

const createSnapshot = (): SessionSnapshot => ({
  messages: [
    {
      id: "message-1",
      role: "thinking",
      content: "Commencing initial action",
      createdAt: 1,
    },
  ],
  todos: [],
  draft: "",
  binding: {
    providerSessionId: null,
    status: "pending",
  },
  status: {
    providerSummary: "Codex",
    tokenUsage: { used: 0, limit: 200_000 },
    connectionState: "idle",
    continuityLock: {
      active: false,
      updatedAt: Date.now(),
    },
    updatedAt: Date.now(),
  },
});

test("SessionMessageLocalizationFacade applies localized content to an existing message", () => {
  const facade = new SessionMessageLocalizationFacade();
  const snapshots: SessionSnapshots = {
    sessionA: createSnapshot(),
  };

  const updated = facade.applyMessageTranslation(snapshots, {
    sessionId: "sessionA",
    messageId: "message-1",
    localizedContent: "Начинаю первое действие",
    sourceHash: "hash-1",
    targetLanguage: "ru",
  });

  assert.notEqual(updated, snapshots);
  assert.equal(
    updated.sessionA.messages[0]?.localizedContent,
    "Начинаю первое действие"
  );
});

test("SessionMessageLocalizationFacade leaves snapshots untouched when message is missing", () => {
  const facade = new SessionMessageLocalizationFacade();
  const snapshots: SessionSnapshots = {
    sessionA: createSnapshot(),
  };

  const updated = facade.applyMessageTranslation(snapshots, {
    sessionId: "sessionA",
    messageId: "message-404",
    localizedContent: "Перевод",
    sourceHash: "hash-1",
    targetLanguage: "ru",
  });

  assert.equal(updated, snapshots);
});

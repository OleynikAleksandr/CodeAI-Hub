import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Session } from "../session-manager";
import { Logger } from "../telemetry/logger";
import { UnifiedSessionStorage } from "./storage";

const createSession = (workspaceRoot: string): Session => ({
  id: "session-1",
  providerId: "codexCli",
  workspacePath: workspaceRoot,
  initiativeSlug: "workspace",
  stage: "description",
  runSlug: "collector",
  continuationParentId: null,
  continuationIndex: 1,
  title: "Session",
  createdAt: "2026-04-29T12:00:00.000Z",
  updatedAt: "2026-04-29T12:00:00.000Z",
  messages: [],
  providerSessionId: "provider-session-1",
  providerSessionStatus: "ready",
});

const getSessionEntries = (
  storage: UnifiedSessionStorage
): Map<string, unknown> =>
  (storage as unknown as { readonly sessions: Map<string, unknown> }).sessions;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitUntil = async (
  condition: () => boolean,
  timeoutMs = 500
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!condition() && Date.now() < deadline) {
    await wait(10);
  }
  assert.equal(condition(), true);
};

test("UnifiedSessionStorage keeps entry until writer close settles", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "unified-storage-close-")
  );
  const storage = new UnifiedSessionStorage({
    rootDirectory: workspaceRoot,
    logger: new Logger("error"),
  });
  const session = createSession(workspaceRoot);
  const entries = getSessionEntries(storage);

  storage.register(session);
  await storage.appendMessage(session.id, {
    id: "message-1",
    role: "assistant",
    content: "hello",
    sessionId: session.id,
    timestamp: "2026-04-29T12:01:00.000Z",
  });

  storage.close(session.id, "test-close");

  assert.equal(entries.has(session.id), true);
  await waitUntil(() => !entries.has(session.id));
});

test("UnifiedSessionStorage coalesces persisted live assistant chunks on read", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "unified-storage-live-chunks-")
  );
  const storage = new UnifiedSessionStorage({
    rootDirectory: workspaceRoot,
    logger: new Logger("error"),
  });
  const session = createSession(workspaceRoot);

  storage.register(session);
  await storage.appendMessage(session.id, {
    id: "user-1",
    role: "user",
    content: "hello",
    sessionId: session.id,
    timestamp: "2026-04-29T12:01:00.000Z",
  });
  await storage.appendMessage(session.id, {
    id: "live-1",
    role: "assistant",
    content: "Привет",
    sessionId: session.id,
    tag: "live",
    timestamp: "2026-04-29T12:02:00.000Z",
  });
  await storage.appendMessage(session.id, {
    id: "live-2",
    role: "assistant",
    content: ", мир.",
    sessionId: session.id,
    tag: "live",
    timestamp: "2026-04-29T12:02:01.000Z",
  });

  const messages = await storage.readMessages(session);

  assert.deepEqual(
    messages.map((message) => [message.role, message.content]),
    [
      ["user", "hello"],
      ["assistant", "Привет, мир."],
    ]
  );
});

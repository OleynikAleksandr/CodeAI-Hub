import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Session } from "../session-manager";
import {
  deleteStandaloneWorkspaceChat,
  listStandaloneWorkspaceChats,
  renameStandaloneWorkspaceChat,
  resolveStandaloneWorkspaceSessionRoot,
  STANDALONE_WORKSPACE_SESSION_SLUG,
} from "./standalone-workspace-chat-list";

const writeJsonl = (
  filePath: string,
  records: readonly Record<string, unknown>[]
): void => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
    "utf8"
  );
};

const createStandaloneSession = (params: {
  readonly id: string;
  readonly messages?: Session["messages"];
  readonly providerId?: string;
  readonly providerSessionId?: string;
  readonly workspacePath: string;
}): Session => ({
  id: params.id,
  providerId: params.providerId ?? "glmNative",
  workspacePath: params.workspacePath,
  initiativeSlug: null,
  stage: null,
  runSlug: null,
  continuationParentId: null,
  continuationIndex: 1,
  title: "Standalone chat",
  createdAt: "2026-06-21T15:04:00.000Z",
  updatedAt: "2026-06-21T15:06:00.000Z",
  messages: params.messages ?? [],
  providerSessionId: params.providerSessionId,
  providerSessionStatus: params.providerSessionId ? "ready" : "pending",
});

test("listStandaloneWorkspaceChats skips overlays and merges live history aliases", async () => {
  const workspacePath = mkdtempSync(
    path.join(os.tmpdir(), "standalone-chat-list-")
  );
  const otherWorkspacePath = mkdtempSync(
    path.join(os.tmpdir(), "standalone-chat-list-other-")
  );
  const providerRoot = path.join(
    resolveStandaloneWorkspaceSessionRoot(workspacePath),
    STANDALONE_WORKSPACE_SESSION_SLUG,
    "glmNative"
  );

  writeJsonl(path.join(providerRoot, "local-session.jsonl"), [
    {
      type: "session-open",
      timestamp: "2026-06-21T15:04:00.000Z",
      provider: "glmNative",
      sessionId: "local-session",
    },
    {
      type: "message",
      timestamp: "2026-06-21T15:04:10.000Z",
      provider: "glmNative",
      messageId: "message-1",
      role: "user",
      content: "Привет, это тестовая сессия.",
    },
  ]);
  writeJsonl(path.join(providerRoot, "local-session.translations.jsonl"), [
    {
      type: "message-translation",
      timestamp: "2026-06-21T15:04:11.000Z",
      messageId: "message-1",
      translatedContent: "Hello.",
    },
  ]);

  const chats = await listStandaloneWorkspaceChats({
    workspacePath,
    liveSessions: [
      createStandaloneSession({
        id: "local-session",
        providerSessionId: "glm-0b31",
        workspacePath,
      }),
      createStandaloneSession({
        id: "other-live-session",
        providerSessionId: "other-provider-session",
        workspacePath: otherWorkspacePath,
      }),
    ],
  });

  assert.equal(chats.length, 1);
  assert.equal(chats[0]?.liveSessionId, "local-session");
  assert.equal(chats[0]?.providerSessionId, "local-session");
  assert.equal(chats[0]?.lastMessagePreview, "Привет, это тестовая сессия.");
});

test("listStandaloneWorkspaceChats prefers live session when history was renamed", async () => {
  const workspacePath = mkdtempSync(
    path.join(os.tmpdir(), "standalone-chat-list-renamed-")
  );
  const providerRoot = path.join(
    resolveStandaloneWorkspaceSessionRoot(workspacePath),
    STANDALONE_WORKSPACE_SESSION_SLUG,
    "claudeCodeCli"
  );

  writeJsonl(path.join(providerRoot, "provider-renamed-session.jsonl"), [
    {
      type: "session-open",
      timestamp: "2026-06-21T15:10:00.000Z",
      provider: "claudeCodeCli",
      sessionId: "provider-renamed-session",
    },
    {
      type: "message",
      timestamp: "2026-06-21T15:10:10.000Z",
      provider: "claudeCodeCli",
      messageId: "message-1",
      role: "user",
      content:
        "Это тестовая сессия, делай в ней только то, о чем я тебя попрошу.",
    },
  ]);

  const chats = await listStandaloneWorkspaceChats({
    workspacePath,
    liveSessions: [
      createStandaloneSession({
        id: "8e0b8187-local-session",
        providerId: "claudeCodeCli",
        workspacePath,
        messages: [
          {
            id: "message-1",
            role: "user",
            sessionId: "8e0b8187-local-session",
            timestamp: "2026-06-21T15:10:10.000Z",
            content:
              "Это тестовая сессия, делай в ней только то, о чем я тебя попрошу.",
          },
        ],
      }),
    ],
  });

  assert.equal(chats.length, 1);
  assert.equal(chats[0]?.liveSessionId, "8e0b8187-local-session");
  assert.equal(chats[0]?.providerSessionId, "provider-renamed-session");
  assert.equal(
    chats[0]?.title,
    "Это тестовая сессия, делай в ней только то, о чем я тебя попрошу."
  );

  await renameStandaloneWorkspaceChat({
    workspacePath,
    providerId: "claudeCodeCli",
    providerSessionId: chats[0]?.providerSessionId ?? "",
    title: "Manual Claude Chat",
  });

  const renamed = await listStandaloneWorkspaceChats({
    workspacePath,
    liveSessions: [
      createStandaloneSession({
        id: "8e0b8187-local-session",
        providerId: "claudeCodeCli",
        workspacePath,
        messages: [
          {
            id: "message-1",
            role: "user",
            sessionId: "8e0b8187-local-session",
            timestamp: "2026-06-21T15:10:10.000Z",
            content:
              "Это тестовая сессия, делай в ней только то, о чем я тебя попрошу.",
          },
        ],
      }),
    ],
  });

  assert.equal(renamed.length, 1);
  assert.equal(renamed[0]?.providerSessionId, "provider-renamed-session");
  assert.equal(renamed[0]?.title, "Manual Claude Chat");
});

test("standalone workspace chat metadata renames and deletes history sidecars", async () => {
  const workspacePath = mkdtempSync(
    path.join(os.tmpdir(), "standalone-chat-list-meta-")
  );
  const providerRoot = path.join(
    resolveStandaloneWorkspaceSessionRoot(workspacePath),
    STANDALONE_WORKSPACE_SESSION_SLUG,
    "codexCli"
  );
  const sessionPath = path.join(providerRoot, "codex-session.jsonl");
  const translationPath = path.join(
    providerRoot,
    "codex-session.translations.jsonl"
  );

  writeJsonl(sessionPath, [
    {
      type: "session-open",
      timestamp: "2026-06-21T15:20:00.000Z",
      provider: "codexCli",
      sessionId: "codex-session",
    },
    {
      type: "message",
      timestamp: "2026-06-21T15:20:10.000Z",
      provider: "codexCli",
      messageId: "message-1",
      role: "user",
      content: "Initial title from first user message.",
    },
  ]);
  writeJsonl(translationPath, [
    {
      type: "message-translation",
      timestamp: "2026-06-21T15:20:11.000Z",
      messageId: "message-1",
      translatedContent: "Перевод.",
    },
  ]);

  await renameStandaloneWorkspaceChat({
    workspacePath,
    providerId: "codexCli",
    providerSessionId: "codex-session",
    title: "Manual Codex Chat",
  });

  const renamed = await listStandaloneWorkspaceChats({
    workspacePath,
    liveSessions: [],
  });
  assert.equal(renamed[0]?.title, "Manual Codex Chat");

  await deleteStandaloneWorkspaceChat({
    workspacePath,
    providerId: "codexCli",
    providerSessionId: "codex-session",
  });

  assert.equal(existsSync(sessionPath), false);
  assert.equal(existsSync(translationPath), false);
  assert.deepEqual(
    await listStandaloneWorkspaceChats({ workspacePath, liveSessions: [] }),
    []
  );
});

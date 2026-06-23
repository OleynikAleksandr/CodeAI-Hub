import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const WORKSPACE_CHAT_LIST_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-chat-list.tsx"
);

const readChatListSource = () => readFile(WORKSPACE_CHAT_LIST_PATH, "utf8");

const sliceBetween = (source: string, start: string, end: string): string => {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `${start} must exist`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `${end} must exist after ${start}`);
  return source.slice(startIndex, endIndex);
};

test("saved standalone chats open after Core restore without pending popup", async () => {
  const source = await readChatListSource();
  const openSessionSource = sliceBetween(
    source,
    "const openSession = useCallback(",
    "  const startNewChat = useCallback("
  );

  assert.equal(
    openSessionSource.includes("openStandaloneSessionPlaceholder"),
    false,
    "saved chat restore must not open a pending detached window"
  );
  assert.equal(
    openSessionSource.includes("providerSessionId: chat.providerSessionId"),
    true,
    "saved chat restore must wait for the matching provider session id"
  );
  assert.equal(
    openSessionSource.includes("sessionId: session.id"),
    true,
    "saved chat restore must open the detached window with the real session id"
  );
});

test("new standalone chats still open a pending popup immediately", async () => {
  const source = await readChatListSource();
  const startNewChatSource = sliceBetween(
    source,
    "const startNewChat = useCallback(",
    "  const renameChat = useCallback("
  );

  assert.equal(
    startNewChatSource.includes("openStandaloneSessionPlaceholder"),
    true,
    "new chat creation should still show the detached pending shell immediately"
  );
  assert.equal(
    startNewChatSource.includes("resolveDefaultStartCardModelSelection"),
    true,
    "new Local Models chats must seed a concrete selected model id"
  );
  assert.equal(
    startNewChatSource.includes('providerId === "openRouter"'),
    true,
    "new OpenRouter chats must seed the selected model slug"
  );
  assert.equal(
    startNewChatSource.includes("targetModelId"),
    true,
    "session:create should receive the selected model id"
  );
});

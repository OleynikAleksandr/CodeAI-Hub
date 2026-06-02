import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const APPEND_DIALOG_MESSAGE_RE = /appendDialogMessage/u;
const APPEND_CORE_MESSAGE_RE = /appendCoreMessage/u;
const DEVELOPMENT_TREE_START_PROMPT_TAG_RE =
  /development-tree-agent-start-prompt/u;
const USER_ROLE_RE = /role:\s*"user"/u;

test("Development Tree start prompts persist as user turns", async () => {
  const source = await readFile(
    new URL("./session-request-handler-runtime-core.ts", import.meta.url),
    "utf8"
  );
  const blockStart = source.indexOf("persistStartPrompt:");
  const blockEnd = source.indexOf("eventMessages,", blockStart);
  const persistStartPromptBlock =
    blockStart >= 0 && blockEnd > blockStart
      ? source.slice(blockStart, blockEnd)
      : "";

  assert.ok(persistStartPromptBlock.length > 0);
  assert.match(persistStartPromptBlock, APPEND_DIALOG_MESSAGE_RE);
  assert.match(persistStartPromptBlock, USER_ROLE_RE);
  assert.match(persistStartPromptBlock, DEVELOPMENT_TREE_START_PROMPT_TAG_RE);
  assert.doesNotMatch(persistStartPromptBlock, APPEND_CORE_MESSAGE_RE);
});

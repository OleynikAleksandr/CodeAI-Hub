import assert from "node:assert/strict";
import test from "node:test";
import type { SessionMessage } from "../../../../types/session";
import { filterContinuityInternalMessages } from "./virtual-conversation";

const createMessage = (
  id: string,
  role: SessionMessage["role"],
  content: string
): SessionMessage => ({
  id,
  role,
  content,
  createdAt: Number(id),
});

test("filterContinuityInternalMessages hides legacy/new continuity ACK including backtick variant", () => {
  const messages: SessionMessage[] = [
    createMessage("1", "assistant", "Ready to continue working."),
    createMessage("2", "assistant", "`__CODEAIHUB_INTERNAL_CONTINUITY_ACK__`"),
    createMessage("3", "assistant", "Visible assistant message"),
    createMessage("4", "user", "__CODEAIHUB_INTERNAL_CONTINUITY_ACK__"),
  ];

  const filtered = filterContinuityInternalMessages(messages);

  assert.equal(
    filtered.some((message) => message.id === "1"),
    false
  );
  assert.equal(
    filtered.some((message) => message.id === "2"),
    false
  );
  assert.equal(
    filtered.some((message) => message.id === "3"),
    true
  );
  assert.equal(
    filtered.some((message) => message.id === "4"),
    true
  );
});

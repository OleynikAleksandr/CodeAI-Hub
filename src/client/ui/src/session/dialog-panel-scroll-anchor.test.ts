import assert from "node:assert/strict";
import test from "node:test";
import type { SessionMessage } from "../../../../types/session";
import { buildDialogPanelScrollAnchor } from "./dialog-panel-scroll-anchor";

const createMessage = (
  id: string,
  role: SessionMessage["role"],
  content: string,
  tag?: SessionMessage["tag"]
): SessionMessage => ({
  id,
  role,
  content,
  createdAt: Number(id),
  ...(tag ? { tag } : {}),
});

test("buildDialogPanelScrollAnchor changes when the last bubble grows", () => {
  const base = [
    createMessage("1", "assistant", "First response."),
    createMessage("2", "assistant", "Thinking chunk one.", "thinking"),
  ] as const;

  const grown = [
    createMessage("1", "assistant", "First response."),
    createMessage(
      "2",
      "assistant",
      "Thinking chunk one.\nThinking chunk two.",
      "thinking"
    ),
  ] as const;

  assert.notEqual(
    buildDialogPanelScrollAnchor(base),
    buildDialogPanelScrollAnchor(grown)
  );
});

test("buildDialogPanelScrollAnchor stays stable for unchanged last bubble", () => {
  const messages = [
    createMessage("1", "user", "Hello"),
    createMessage("2", "assistant", "Ready."),
  ] as const;

  assert.equal(
    buildDialogPanelScrollAnchor(messages),
    buildDialogPanelScrollAnchor(messages)
  );
});

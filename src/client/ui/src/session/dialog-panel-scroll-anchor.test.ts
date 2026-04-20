import assert from "node:assert/strict";
import test from "node:test";
import type { SessionMessage } from "../../../../types/session";
import { buildDialogPanelScrollAnchor } from "./dialog-panel-scroll-anchor";

const createMessage = (
  id: string,
  role: SessionMessage["role"],
  content: string,
  options?: {
    readonly tag?: SessionMessage["tag"];
    readonly localizedContent?: string;
  }
): SessionMessage => ({
  id,
  role,
  content,
  createdAt: Number(id),
  ...(options?.tag ? { tag: options.tag } : {}),
  ...(options?.localizedContent
    ? { localizedContent: options.localizedContent }
    : {}),
});

test("buildDialogPanelScrollAnchor changes when the last bubble grows", () => {
  const base = [
    createMessage("1", "assistant", "First response."),
    createMessage("2", "assistant", "Thinking chunk one.", {
      tag: "thinking",
    }),
  ] as const;

  const grown = [
    createMessage("1", "assistant", "First response."),
    createMessage(
      "2",
      "assistant",
      "Thinking chunk one.\nThinking chunk two.",
      { tag: "thinking" }
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

test("buildDialogPanelScrollAnchor changes when only localized last-bubble display text grows", () => {
  const base = [
    createMessage("1", "assistant", "First response."),
    createMessage("2", "thinking", "Thinking chunk one."),
  ] as const;

  const localized = [
    createMessage("1", "assistant", "First response."),
    createMessage("2", "thinking", "Thinking chunk one.", {
      localizedContent:
        "Первый фрагмент размышления.\n\nВторой фрагмент перевода, который заметно длиннее.",
    }),
  ] as const;

  assert.notEqual(
    buildDialogPanelScrollAnchor(base),
    buildDialogPanelScrollAnchor(localized)
  );
});

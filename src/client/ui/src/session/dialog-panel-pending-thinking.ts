import type { SessionMessage } from "../../../../types/session";

export const resolvePendingThinkingMessageId = (
  messages: readonly SessionMessage[]
): string | null => {
  let lastAssistantIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") {
      lastAssistantIndex = index;
      break;
    }
  }

  for (
    let index = messages.length - 1;
    index > lastAssistantIndex;
    index -= 1
  ) {
    const message = messages[index];
    if (message?.role === "thinking") {
      return message.id;
    }
  }

  return null;
};

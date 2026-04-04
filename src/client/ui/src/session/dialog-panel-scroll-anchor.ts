import type { SessionMessage } from "../../../../types/session";

const HASH_MODULUS = 4_294_967_291;

const hashContent = (value: string): number => {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % HASH_MODULUS;
  }
  return hash;
};

export const buildDialogPanelScrollAnchor = (
  messages: readonly SessionMessage[]
): string => {
  if (messages.length === 0) {
    return "empty";
  }

  const lastMessage = messages.at(-1);
  if (!lastMessage) {
    return "empty";
  }

  return [
    messages.length,
    lastMessage.id,
    lastMessage.role,
    lastMessage.tag ?? "",
    hashContent(lastMessage.content),
  ].join(":");
};

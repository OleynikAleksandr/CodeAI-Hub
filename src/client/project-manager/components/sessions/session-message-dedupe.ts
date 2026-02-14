import type { SessionMessage } from "../../../../types/session";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";

export const appendDedupedSessionMessageToSnapshots = (
  snapshots: SessionSnapshots,
  payload: { readonly sessionId: string; readonly message: SessionMessage }
): SessionSnapshots => {
  const snapshot = snapshots[payload.sessionId];
  if (!snapshot) {
    return snapshots;
  }
  const last = snapshot.messages.at(-1);
  if (
    last &&
    last.role === payload.message.role &&
    last.content === payload.message.content
  ) {
    return snapshots;
  }
  if (snapshot.messages.some((message) => message.id === payload.message.id)) {
    return snapshots;
  }
  return {
    ...snapshots,
    [payload.sessionId]: {
      ...snapshot,
      messages: [...snapshot.messages, payload.message],
    },
  };
};

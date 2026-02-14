import type { SessionMessage } from "../../../../types/session";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";

const RECENT_DEDUPE_SCAN_LIMIT = 200;

const isReplayDuplicate = (options: {
  readonly existing: SessionMessage;
  readonly incoming: SessionMessage;
}): boolean =>
  options.existing.role === options.incoming.role &&
  options.existing.createdAt === options.incoming.createdAt &&
  options.existing.content === options.incoming.content;

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

  // Reconnect/replay can deliver the same message multiple times with new ids
  // (or with a race that still duplicates ids). We treat createdAt+role+content
  // as the stable identity for UI display, scoped to the recent tail.
  for (
    let index = snapshot.messages.length - 1;
    index >= 0 &&
    index >= snapshot.messages.length - RECENT_DEDUPE_SCAN_LIMIT;
    index -= 1
  ) {
    const candidate = snapshot.messages[index];
    if (
      candidate &&
      isReplayDuplicate({ existing: candidate, incoming: payload.message })
    ) {
      return snapshots;
    }
  }
  return {
    ...snapshots,
    [payload.sessionId]: {
      ...snapshot,
      messages: [...snapshot.messages, payload.message],
    },
  };
};

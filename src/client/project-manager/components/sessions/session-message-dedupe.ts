import type { SessionMessage } from "../../../../types/session";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";

const RECENT_DEDUPE_SCAN_LIMIT = 200;
const OPTIMISTIC_MESSAGE_ID_PREFIX = "optimistic-";
const OPTIMISTIC_USER_RECONCILIATION_WINDOW_MS = 30_000;

const isReplayDuplicate = (options: {
  readonly existing: SessionMessage;
  readonly incoming: SessionMessage;
}): boolean =>
  options.existing.role === options.incoming.role &&
  options.existing.createdAt === options.incoming.createdAt &&
  options.existing.content === options.incoming.content;

const mergeLocalizedContent = (options: {
  readonly existing: SessionMessage;
  readonly incoming: SessionMessage;
}): SessionMessage | null => {
  if (options.existing.id !== options.incoming.id) {
    return null;
  }
  if (
    options.existing.localizedContent === options.incoming.localizedContent ||
    typeof options.incoming.localizedContent !== "string" ||
    options.incoming.localizedContent.trim().length === 0
  ) {
    return null;
  }
  return {
    ...options.existing,
    localizedContent: options.incoming.localizedContent,
  };
};

const isOptimisticUserMessage = (message: SessionMessage): boolean =>
  message.role === "user" &&
  message.id.startsWith(OPTIMISTIC_MESSAGE_ID_PREFIX);

const isCanonicalUserMessage = (message: SessionMessage): boolean =>
  message.role === "user" &&
  !message.id.startsWith(OPTIMISTIC_MESSAGE_ID_PREFIX);

const isOptimisticUserReconciliationCandidate = (options: {
  readonly existing: SessionMessage;
  readonly incoming: SessionMessage;
}): boolean =>
  isOptimisticUserMessage(options.existing) &&
  isCanonicalUserMessage(options.incoming) &&
  options.existing.content === options.incoming.content &&
  Math.abs(options.existing.createdAt - options.incoming.createdAt) <=
    OPTIMISTIC_USER_RECONCILIATION_WINDOW_MS;

const findOptimisticUserCandidateIndex = (
  messages: readonly SessionMessage[],
  incoming: SessionMessage
): number => {
  if (!isCanonicalUserMessage(incoming)) {
    return -1;
  }

  for (
    let index = messages.length - 1;
    index >= 0 && index >= messages.length - RECENT_DEDUPE_SCAN_LIMIT;
    index -= 1
  ) {
    const candidate = messages[index];
    if (
      candidate &&
      isOptimisticUserReconciliationCandidate({
        existing: candidate,
        incoming,
      })
    ) {
      return index;
    }
  }

  return -1;
};

const updateSnapshotMessages = (options: {
  readonly snapshots: SessionSnapshots;
  readonly snapshot: SessionSnapshots[string];
  readonly sessionId: string;
  readonly messages: readonly SessionMessage[];
}): SessionSnapshots => ({
  ...options.snapshots,
  [options.sessionId]: {
    ...options.snapshot,
    messages: [...options.messages],
  },
});

export const appendOptimisticUserMessage = (
  snapshots: SessionSnapshots,
  sessionId: string,
  content: string
): SessionSnapshots =>
  appendDedupedSessionMessageToSnapshots(snapshots, {
    sessionId,
    message: {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content,
      createdAt: Date.now(),
    },
  });

export const appendDedupedSessionMessageToSnapshots = (
  snapshots: SessionSnapshots,
  payload: { readonly sessionId: string; readonly message: SessionMessage }
): SessionSnapshots => {
  const snapshot = snapshots[payload.sessionId];
  if (!snapshot) {
    return snapshots;
  }

  const optimisticCandidateIndex = findOptimisticUserCandidateIndex(
    snapshot.messages,
    payload.message
  );
  const messageIndex = snapshot.messages.findIndex(
    (message) => message.id === payload.message.id
  );
  if (messageIndex >= 0) {
    let messages: SessionMessage[] | null = null;
    const merged = mergeLocalizedContent({
      existing: snapshot.messages[messageIndex],
      incoming: payload.message,
    });
    if (merged) {
      messages = [...snapshot.messages];
      messages[messageIndex] = merged;
    }

    if (
      optimisticCandidateIndex >= 0 &&
      optimisticCandidateIndex !== messageIndex
    ) {
      messages ??= [...snapshot.messages];
      messages.splice(optimisticCandidateIndex, 1);
    }

    if (!messages) {
      return snapshots;
    }

    return updateSnapshotMessages({
      snapshots,
      snapshot,
      sessionId: payload.sessionId,
      messages,
    });
  }

  if (optimisticCandidateIndex >= 0) {
    const messages = [...snapshot.messages];
    messages[optimisticCandidateIndex] = payload.message;
    return updateSnapshotMessages({
      snapshots,
      snapshot,
      sessionId: payload.sessionId,
      messages,
    });
  }

  const last = snapshot.messages.at(-1);
  if (
    last &&
    last.role === payload.message.role &&
    last.content === payload.message.content
  ) {
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
  return updateSnapshotMessages({
    snapshots,
    snapshot,
    sessionId: payload.sessionId,
    messages: [...snapshot.messages, payload.message],
  });
};

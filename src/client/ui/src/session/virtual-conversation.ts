import type {
  SessionMessage,
  SessionRecord,
  SessionSnapshot,
} from "../../../../types/session";

type MessageWithSegmentIndex = {
  readonly message: SessionMessage;
  readonly segmentIndex: number;
};

const compareMessageIds = (left: string, right: string): number => {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
};

export const resolveContinuationChain = (params: {
  readonly sessions: readonly SessionRecord[];
  readonly activeSessionId: string;
}): readonly SessionRecord[] => {
  const sessionsById = new Map(
    params.sessions.map((session) => [session.id, session] as const)
  );
  const active = sessionsById.get(params.activeSessionId);
  if (!active) {
    return [];
  }

  const chain: SessionRecord[] = [];
  const visited = new Set<string>();
  let cursor: SessionRecord | undefined = active;
  while (cursor) {
    if (visited.has(cursor.id)) {
      break;
    }
    visited.add(cursor.id);
    chain.push(cursor);
    if (!cursor.continuationParentId) {
      break;
    }
    cursor = sessionsById.get(cursor.continuationParentId);
  }

  chain.reverse();
  return chain;
};

export const buildVirtualConversationMessages = (params: {
  readonly chain: readonly SessionRecord[];
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
}): readonly SessionMessage[] => {
  const collected: MessageWithSegmentIndex[] = [];
  for (const [segmentIndex, segment] of params.chain.entries()) {
    const snapshot = params.snapshots[segment.id];
    if (!snapshot) {
      continue;
    }
    for (const message of snapshot.messages) {
      collected.push({ message, segmentIndex });
    }
  }

  collected.sort((left, right) => {
    if (left.message.createdAt !== right.message.createdAt) {
      return left.message.createdAt - right.message.createdAt;
    }
    if (left.segmentIndex !== right.segmentIndex) {
      return left.segmentIndex - right.segmentIndex;
    }
    return compareMessageIds(left.message.id, right.message.id);
  });

  return collected.map((entry) => entry.message);
};

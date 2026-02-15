import { useEffect, useState } from "react";
import {
  getDefaultProviderTitle,
  type ProviderStackId,
} from "../../../../types/provider";
import type {
  SessionMessage,
  SessionRecord,
  SessionSnapshot,
} from "../../../../types/session";
import { isContinuityInternalMessage } from "./continuity-internal-message";
import { isSegmentBoundaryMessage } from "./dialog-panel-message-utils";
import SessionTabs from "./session-tabs";
import {
  collectChainSegmentMessages,
  dedupeVirtualConversationMessages,
} from "./virtual-conversation-message-utils";

export { buildTokenDebugSummary } from "./token-debug-summary";

const filterContinuityInternalSegmentMessages = (
  segment: readonly SessionMessage[]
): readonly SessionMessage[] => {
  if (segment.length === 0) {
    return segment;
  }

  const containsInternalAck = segment.some((message) =>
    isContinuityInternalMessage(message)
  );
  const withoutInternalAck = containsInternalAck
    ? segment.filter((message) => !isContinuityInternalMessage(message))
    : segment;

  if (!containsInternalAck) {
    return withoutInternalAck;
  }

  const firstUserIndex = withoutInternalAck.findIndex(
    (message) => message.role === "user"
  );
  if (firstUserIndex < 0) {
    return withoutInternalAck.filter(
      (message) => message.role !== "assistant" && message.role !== "thinking"
    );
  }

  const prefix = withoutInternalAck
    .slice(0, firstUserIndex)
    .filter(
      (message) => message.role !== "assistant" && message.role !== "thinking"
    );
  if (prefix.length === 0) {
    return withoutInternalAck;
  }

  return [...prefix, ...withoutInternalAck.slice(firstUserIndex)];
};

export const filterContinuityInternalMessages = (
  messages: readonly SessionMessage[]
): readonly SessionMessage[] => {
  if (!messages.some((message) => isContinuityInternalMessage(message))) {
    return messages;
  }

  const next: SessionMessage[] = [];
  let segment: SessionMessage[] = [];
  for (const message of messages) {
    if (isSegmentBoundaryMessage(message)) {
      next.push(...filterContinuityInternalSegmentMessages(segment));
      segment = [];
      next.push(message);
      continue;
    }
    segment.push(message);
  }
  next.push(...filterContinuityInternalSegmentMessages(segment));

  return next;
};

export const resolveActiveSessionSnapshot = (options: {
  readonly activeSessionId: string | null;
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
}): SessionSnapshot | null => {
  if (!options.activeSessionId) {
    return null;
  }
  const snapshot = options.snapshots[options.activeSessionId];
  return snapshot ?? null;
};

export const useAgentWorkingIndicator = (options: {
  readonly activeSessionId: string | null;
  readonly lastMessageRole: string | null;
  readonly lastMessageCreatedAt: number | null;
}): boolean => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);

    if (
      !options.activeSessionId ||
      options.lastMessageRole !== "user" ||
      !options.lastMessageCreatedAt
    ) {
      return;
    }

    const elapsedMs = Date.now() - options.lastMessageCreatedAt;
    const delayMs = Math.max(0, 10_000 - elapsedMs);
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    options.activeSessionId,
    options.lastMessageCreatedAt,
    options.lastMessageRole,
  ]);

  return visible;
};

type SessionHeaderProps = {
  readonly sessions: readonly SessionRecord[];
  readonly providerLabels: ReadonlyMap<ProviderStackId, string>;
  readonly activeSessionId: string | null;
  readonly onSelectSession: (sessionId: string) => void;
  readonly onCloseSession: (sessionId: string) => void;
};

export const SessionHeader = ({
  sessions,
  providerLabels,
  activeSessionId,
  onSelectSession,
  onCloseSession,
}: SessionHeaderProps) => (
  <div className="session-app__header">
    <SessionTabs
      activeSessionId={activeSessionId}
      onClose={onCloseSession}
      onSelect={onSelectSession}
      providerLabels={providerLabels}
      sessions={sessions}
    />
  </div>
);

export const resolveProviderDisplayLabel = (options: {
  readonly providerId: ProviderStackId | null;
  readonly providerLabels: ReadonlyMap<ProviderStackId, string>;
}): string | null => {
  if (!options.providerId) {
    return null;
  }
  return (
    options.providerLabels.get(options.providerId) ??
    getDefaultProviderTitle(options.providerId)
  );
};

export const computeFallbackContinuationIndex = (options: {
  readonly record: SessionRecord | null;
  readonly sessions: readonly SessionRecord[];
}): number | null => {
  const record = options.record;
  if (!record) {
    return null;
  }
  if (!record.continuationParentId) {
    return 1;
  }

  const sessionsById = new Map(
    options.sessions.map((session) => [session.id, session] as const)
  );
  const visited = new Set<string>();
  let index = 1;
  let cursor: SessionRecord | undefined = record;

  while (cursor?.continuationParentId) {
    if (visited.has(cursor.id)) {
      break;
    }
    visited.add(cursor.id);
    index += 1;
    cursor = sessionsById.get(cursor.continuationParentId);
    if (!cursor) {
      break;
    }
  }

  return Math.max(index, 2);
};

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
  const lastSegmentIndex = Math.max(0, params.chain.length - 1);
  for (const [segmentIndex, segment] of params.chain.entries()) {
    const snapshot = params.snapshots[segment.id];
    if (!snapshot) {
      continue;
    }
    const messages = collectChainSegmentMessages({
      snapshot,
      segmentIndex,
      lastSegmentIndex,
    });
    for (const message of messages) {
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

  return dedupeVirtualConversationMessages(
    filterContinuityInternalMessages(collected.map((entry) => entry.message))
  );
};

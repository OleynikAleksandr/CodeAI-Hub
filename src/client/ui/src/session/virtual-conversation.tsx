import { useEffect, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { getDefaultProviderTitle } from "../../../../types/provider";
import type {
  SessionMessage,
  SessionRecord,
  SessionSnapshot,
} from "../../../../types/session";
import InfoPanel from "./info-panel";
import SessionTabs from "./session-tabs";

const CONTINUITY_INTERNAL_ACK = "__CODEAIHUB_INTERNAL_CONTINUITY_ACK__";

export const filterContinuityInternalMessages = (
  messages: readonly SessionMessage[]
): readonly SessionMessage[] => {
  for (const message of messages) {
    if (
      message.role === "assistant" &&
      message.content.trim() === CONTINUITY_INTERNAL_ACK
    ) {
      return messages.filter(
        (candidate) =>
          !(
            candidate.role === "assistant" &&
            candidate.content.trim() === CONTINUITY_INTERNAL_ACK
          )
      );
    }
  }
  return messages;
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
  readonly activeSession: SessionSnapshot | null;
  readonly continuationIndex: number | null;
  readonly onSelectSession: (sessionId: string) => void;
  readonly onCloseSession: (sessionId: string) => void;
};

export const SessionHeader = ({
  sessions,
  providerLabels,
  activeSessionId,
  activeSession,
  continuationIndex,
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
    {activeSession && activeSessionId ? (
      <InfoPanel
        binding={activeSession.binding}
        continuationIndex={continuationIndex}
      />
    ) : null}
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
  for (const [segmentIndex, segment] of params.chain.entries()) {
    const snapshot = params.snapshots[segment.id];
    if (!snapshot) {
      continue;
    }
    const firstUserIndex =
      segmentIndex > 0
        ? snapshot.messages.findIndex((message) => message.role === "user")
        : 0;
    if (segmentIndex > 0 && firstUserIndex < 0) {
      continue;
    }
    for (const message of snapshot.messages.slice(firstUserIndex)) {
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

  return filterContinuityInternalMessages(
    collected.map((entry) => entry.message)
  );
};

export const buildTokenDebugSummary = (params: {
  readonly chain: readonly SessionRecord[];
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
  readonly activeSessionId: string;
}): string | null => {
  if (params.chain.length <= 1) {
    return null;
  }

  const formatRemainingPercent = (options: {
    readonly used: number;
    readonly limit: number;
  }): string => {
    if (!(Number.isFinite(options.used) && Number.isFinite(options.limit))) {
      return "—";
    }
    if (options.limit <= 0) {
      return "—";
    }
    const usedPercentage = Math.max(
      0,
      Math.min(100, Math.round((options.used / options.limit) * 100))
    );
    const remainingPercentage = Math.max(
      0,
      Math.min(100, 100 - usedPercentage)
    );
    return `${remainingPercentage}%`;
  };

  const parts: string[] = [];
  for (const [index, segment] of params.chain.entries()) {
    const snapshot = params.snapshots[segment.id];
    if (!snapshot) {
      continue;
    }

    const label = `#${index + 1}`;
    const formatted = `${label} ${formatRemainingPercent({
      used: snapshot.status.tokenUsage.used,
      limit: snapshot.status.tokenUsage.limit,
    })}`;
    parts.push(formatted);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
};

import type { SessionMessage, SessionSnapshot } from "../../../../types/session";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";
import { logManagedInputDiagnostic } from "./managed-input-diagnostics";

const RECENT_DEDUPE_SCAN_LIMIT = 200;
const OPTIMISTIC_MESSAGE_ID_PREFIX = "optimistic-";
const OPTIMISTIC_USER_RECONCILIATION_WINDOW_MS = 30_000;
const MANAGED_WORKFLOW_CONTINUATION_LOCK_REASON =
  "managed_workflow_core_agent_turn";
const MANAGED_WORKFLOW_CONTINUATION_TAG = "managed-workflow-continuation";
const MANAGED_WORKFLOW_RELEASE_TAGS = new Set([
  "managed-workflow-complete",
  "managed-workflow-user-review",
]);

const describeMessageForDiagnostics = (
  message: SessionMessage
): Record<string, unknown> => ({
  contentLength: message.content.length,
  createdAt: message.createdAt,
  id: message.id,
  role: message.role,
  tag: message.tag ?? null,
  visibilityAtEmission: message.visibilityAtEmission ?? null,
});

const describeInputStateForDiagnostics = (
  snapshot: SessionSnapshot
): Record<string, unknown> => ({
  connectionState: snapshot.status.connectionState,
  continuityLock: snapshot.status.continuityLock
    ? {
        active: snapshot.status.continuityLock.active,
        reason: snapshot.status.continuityLock.reason ?? null,
        updatedAt: snapshot.status.continuityLock.updatedAt,
      }
    : null,
});

const logInputLockDecision = (options: {
  readonly after?: SessionSnapshot;
  readonly before: SessionSnapshot;
  readonly event: string;
  readonly message: SessionMessage;
  readonly sessionId: string;
}): void => {
  logManagedInputDiagnostic(options.event, {
    after: options.after
      ? describeInputStateForDiagnostics(options.after)
      : null,
    before: describeInputStateForDiagnostics(options.before),
    message: describeMessageForDiagnostics(options.message),
    sessionId: options.sessionId,
  });
};

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
  readonly triggerMessage: SessionMessage;
}): SessionSnapshots => {
  const snapshotWithMessages = applyManagedWorkflowInputLock({
    message: options.triggerMessage,
    sessionId: options.sessionId,
    snapshot: {
      ...options.snapshot,
      messages: [...options.messages],
    },
  });
  return {
    ...options.snapshots,
    [options.sessionId]: snapshotWithMessages,
  };
};

const updateSnapshotForMessageSideEffects = (options: {
  readonly message: SessionMessage;
  readonly sessionId: string;
  readonly snapshot: SessionSnapshot;
  readonly snapshots: SessionSnapshots;
}): SessionSnapshots => {
  const updated = applyManagedWorkflowInputLock({
    message: options.message,
    sessionId: options.sessionId,
    snapshot: options.snapshot,
  });
  if (updated === options.snapshot) {
    return options.snapshots;
  }
  return {
    ...options.snapshots,
    [options.sessionId]: updated,
  };
};

const shouldReleaseManagedWorkflowLock = (
  snapshot: SessionSnapshot
): boolean => {
  if (
    snapshot.status.connectionState === "running" &&
    snapshot.status.continuityLock?.active !== true
  ) {
    return true;
  }
  const reason = snapshot.status.continuityLock?.reason;
  return (
    reason === "managed_core_gated" ||
    reason === MANAGED_WORKFLOW_CONTINUATION_LOCK_REASON ||
    reason === "diagram_modules_sequence"
  );
};

const applyManagedWorkflowInputLock = (options: {
  readonly message: SessionMessage;
  readonly sessionId: string;
  readonly snapshot: SessionSnapshot;
}): SessionSnapshot => {
  const tag = options.message.tag;
  const now = Date.now();
  if (tag === MANAGED_WORKFLOW_CONTINUATION_TAG) {
    const next: SessionSnapshot = {
      ...options.snapshot,
      status: {
        ...options.snapshot.status,
        connectionState:
          options.snapshot.status.connectionState === "running"
            ? "running"
            : "blocked",
        continuityLock: {
          ...(options.snapshot.status.continuityLock ?? {
            active: false,
            updatedAt: now,
          }),
          active: true,
          reason: MANAGED_WORKFLOW_CONTINUATION_LOCK_REASON,
          updatedAt: now,
        },
        updatedAt: now,
      },
    };
    logInputLockDecision({
      after: next,
      before: options.snapshot,
      event: "pm.message_dedupe.lock_from_managed_continuation",
      message: options.message,
      sessionId: options.sessionId,
    });
    return next;
  }
  if (options.message.role !== "system") {
    return options.snapshot;
  }
  if (!MANAGED_WORKFLOW_RELEASE_TAGS.has(tag ?? "")) {
    return options.snapshot;
  }
  if (!shouldReleaseManagedWorkflowLock(options.snapshot)) {
    logInputLockDecision({
      before: options.snapshot,
      event: "pm.message_dedupe.release_ignored_for_lock_reason",
      message: options.message,
      sessionId: options.sessionId,
    });
    return options.snapshot;
  }
  const next: SessionSnapshot = {
    ...options.snapshot,
    status: {
      ...options.snapshot.status,
      connectionState:
        options.snapshot.status.connectionState === "blocked" ||
        options.snapshot.status.connectionState === "running"
          ? "idle"
          : options.snapshot.status.connectionState,
      continuityLock: {
        active: false,
        updatedAt: now,
      },
      updatedAt: now,
    },
  };
  logInputLockDecision({
    after: next,
    before: options.snapshot,
    event: "pm.message_dedupe.release_from_managed_system_tag",
    message: options.message,
    sessionId: options.sessionId,
  });
  return next;
};

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
      return updateSnapshotForMessageSideEffects({
        message: payload.message,
        sessionId: payload.sessionId,
        snapshot,
        snapshots,
      });
    }

    return updateSnapshotMessages({
      triggerMessage: payload.message,
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
      triggerMessage: payload.message,
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
    return updateSnapshotForMessageSideEffects({
      message: payload.message,
      sessionId: payload.sessionId,
      snapshot,
      snapshots,
    });
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
      return updateSnapshotForMessageSideEffects({
        message: payload.message,
        sessionId: payload.sessionId,
        snapshot,
        snapshots,
      });
    }
  }
  return updateSnapshotMessages({
    triggerMessage: payload.message,
    snapshots,
    snapshot,
    sessionId: payload.sessionId,
    messages: [...snapshot.messages, payload.message],
  });
};

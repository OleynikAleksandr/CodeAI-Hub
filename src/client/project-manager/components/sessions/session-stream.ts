import { useEffect } from "react";
import type { SessionMessage, SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";
import {
  isContextDecisionPending,
  isRolloverPendingAfterTerminalTurn,
  resolveContinuityLockActive,
  resolveContinuityLockReason,
} from "./session-lock-guards";
import {
  createSystemSessionMessage,
  sanitizeSession,
  sanitizeSessionBindingPayload,
  sanitizeSessionErrorPayload,
  sanitizeSessionMessagePayload,
} from "../../../ui/src/core-bridge/normalizers";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";
type IncomingMessage = {
  readonly type: string;
  readonly payload?: unknown;
};
type SessionBindingUpdate = {
  readonly sessionId: string;
  readonly providerSessionId: string | null;
  readonly status: "pending" | "ready" | "failed";
};
type SessionMessageUpdate = { readonly sessionId: string; readonly message: SessionMessage };
type SessionHistoryUpdate = {
  readonly sessionId: string;
  readonly messages: readonly unknown[];
};

const readProviderSessionId = (
  session: WorkspaceSnapshotPushPayload["snapshot"]["sessions"][string]
): string | null => {
  const providerSessionId = session.providerSessionId;
  if (typeof providerSessionId !== "string") {
    return null;
  }
  const normalized = providerSessionId.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveTargetSnapshotId = (options: {
  readonly snapshots: SessionSnapshots;
  readonly runtimeSessionId: string;
  readonly workspaceSession: WorkspaceSnapshotPushPayload["snapshot"]["sessions"][string];
}): string | null => {
  if (options.snapshots[options.runtimeSessionId]) {
    return options.runtimeSessionId;
  }
  const providerSessionId = readProviderSessionId(options.workspaceSession);
  if (!providerSessionId) {
    return null;
  }
  const fallback = Object.entries(options.snapshots).find(
    ([, snapshot]) => snapshot.binding.providerSessionId === providerSessionId
  );
  return fallback?.[0] ?? null;
};

export const applyWorkspaceSnapshotToSnapshots = (
  snapshots: SessionSnapshots,
  payload: WorkspaceSnapshotPushPayload
): SessionSnapshots => {
  let changed = false;
  const nextSnapshots: SessionSnapshots = { ...snapshots };
  const heldLockReasonBySessionId = new Map<string, string>();
  for (const session of Object.values(payload.snapshot.sessions)) {
    const transition = session.continuityLockTransition;
    if (transition?.awaitingBootstrapTurn !== true) {
      continue;
    }
    heldLockReasonBySessionId.set(transition.sourceSessionId, transition.reason);
    if (transition.targetSessionId) {
      heldLockReasonBySessionId.set(transition.targetSessionId, transition.reason);
    }
  }
  for (const [sessionId, session] of Object.entries(payload.snapshot.sessions)) {
    const targetSnapshotId = resolveTargetSnapshotId({
      snapshots,
      runtimeSessionId: sessionId,
      workspaceSession: session,
    });
    if (!targetSnapshotId) {
      continue;
    }
    const current = snapshots[targetSnapshotId];
    if (!current) {
      continue;
    }
    const awaitingBootstrapTurn =
      session.continuityLockTransition?.awaitingBootstrapTurn === true;
    const graphHeldReason =
      heldLockReasonBySessionId.get(sessionId) ??
      heldLockReasonBySessionId.get(targetSnapshotId);
    const nextLockReason = resolveContinuityLockReason(session) ?? graphHeldReason;
    const contextDecisionPending = isContextDecisionPending(session, nextLockReason);
    const rolloverPending = isRolloverPendingAfterTerminalTurn(
      session,
      nextLockReason
    );
    const isNoResumeSession = session.resumeMode === "no_resume";
    let nextLockActive =
      resolveContinuityLockActive(session) ||
      contextDecisionPending ||
      rolloverPending ||
      heldLockReasonBySessionId.has(sessionId) ||
      isNoResumeSession;
    let nextConnectionState: "idle" | "running" | "blocked";
    if (session.turnState === "running") {
      nextConnectionState = "running";
    } else if (nextLockActive) {
      nextConnectionState = "blocked";
    } else {
      nextConnectionState = "idle";
    }
    const currentLockActive = current.status.continuityLock?.active === true;
    const currentLockReason = current.status.continuityLock?.reason;
    const currentTimerTotalSeconds = current.status.taskTimer?.totalSeconds ?? 0;
    const currentTimerRunningSinceMs =
      current.status.taskTimer?.runningSinceMs ?? null;
    const nextTimerTotalSeconds = session.taskTimer?.totalSeconds ?? 0;
    const nextTimerRunningSinceMs = session.taskTimer?.runningSinceMs ?? null;
    const allowIdleUnlock =
      nextLockReason === "resume_ready" ||
      nextLockReason === "resume_failed" ||
      nextLockReason === "resume_timeout" ||
      (nextLockReason === "no_rollover_needed" &&
        session.resumeMode !== "resume_via_rollover");
    const snapshotSignalsIdleUnlocked =
      session.turnState === "idle" &&
      session.continuityLockActive === false &&
      !awaitingBootstrapTurn;
    if (
      (current.status.connectionState === "blocked" ||
        current.status.connectionState === "running") &&
      nextConnectionState === "idle" &&
      !snapshotSignalsIdleUnlocked &&
      (!allowIdleUnlock || awaitingBootstrapTurn)
    ) {
      nextLockActive = true;
      nextConnectionState = "blocked";
    }
    if (
      current.status.connectionState === nextConnectionState &&
      currentLockActive === nextLockActive &&
      currentLockReason === nextLockReason &&
      currentTimerTotalSeconds === nextTimerTotalSeconds &&
      currentTimerRunningSinceMs === nextTimerRunningSinceMs
    ) {
      continue;
    }
    changed = true;
    const now = Date.now();
    nextSnapshots[targetSnapshotId] = {
      ...current,
      status: {
        ...current.status,
        connectionState: nextConnectionState,
        continuityLock: {
          ...(current.status.continuityLock ?? { active: false, updatedAt: now }),
          active: nextLockActive,
          ...(nextLockReason ? { reason: nextLockReason } : {}),
          updatedAt: now,
        },
        taskTimer: {
          totalSeconds: nextTimerTotalSeconds,
          runningSinceMs: nextTimerRunningSinceMs,
        },
        updatedAt: now,
      },
    };
  }
  return changed ? nextSnapshots : snapshots;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export const useProjectManagerSessionStream = (params: {
  readonly onSessionCreated: (session: SessionRecord) => void;
  readonly onSessionMessage: (payload: SessionMessageUpdate) => void;
  readonly onSessionHistory: (payload: SessionHistoryUpdate) => void;
  readonly onSessionBinding: (payload: SessionBindingUpdate) => void;
  readonly onSessionDeleted: (sessionId: string) => void;
  readonly onSessionStream?: (payload: {
    readonly sessionId: string;
    readonly event: unknown;
  }) => void;
  readonly onWorkspaceSnapshot?: (payload: WorkspaceSnapshotPushPayload) => void;
}) => {
  useEffect(() => {
    const unsubscribe = api.onCoreEvent((message: IncomingMessage) => {
      if (message.type === "session:created") {
        const normalized = sanitizeSession(message.payload as never);
        if (normalized) {
          params.onSessionCreated(normalized);
        }
        return;
      }
      if (message.type === "session:message") {
        const normalized = sanitizeSessionMessagePayload(message.payload);
        if (normalized) {
          params.onSessionMessage(normalized);
        }
        return;
      }
      if (message.type === "session:history") {
        const payload = message.payload as {
          readonly sessionId?: unknown;
          readonly messages?: unknown;
        };
        if (
          payload &&
          typeof payload.sessionId === "string" &&
          Array.isArray(payload.messages)
        ) {
          params.onSessionHistory({
            sessionId: payload.sessionId,
            messages: payload.messages,
          });
        }
        return;
      }
      if (message.type === "session:binding") {
        const normalized = sanitizeSessionBindingPayload(message.payload);
        if (!normalized) {
          return;
        }
        params.onSessionBinding(normalized);
        return;
      }
      if (message.type === "session:deleted") {
        const payload = message.payload as { readonly sessionId?: unknown };
        if (payload && typeof payload.sessionId === "string") {
          params.onSessionDeleted(payload.sessionId);
        }
        return;
      }
      if (message.type === "session:stream") {
        const payload = message.payload as {
          readonly sessionId?: unknown;
          readonly event?: unknown;
        };
        if (payload && typeof payload.sessionId === "string") {
          params.onSessionStream?.({
            sessionId: payload.sessionId,
            event: payload.event,
          });
        }
        return;
      }
      if (message.type === "workspace:snapshot") {
        const payload = message.payload as WorkspaceSnapshotPushPayload;
        if (
          payload &&
          typeof payload.workspaceRoot === "string" &&
          typeof payload.selectionId === "string" &&
          typeof payload.sequence === "number" &&
          isRecord(payload.snapshot) &&
          isRecord(payload.snapshot.sessions)
        ) {
          params.onWorkspaceSnapshot?.(payload);
        }
        return;
      }
      if (message.type === "session:error") {
        const resolved = sanitizeSessionErrorPayload(message.payload);
        if (!resolved) {
          return;
        }
        params.onSessionMessage({
          sessionId: resolved.sessionId,
          message: createSystemSessionMessage(resolved.message),
        });
      }
    });
    return () => {
      unsubscribe();
    };
  }, [
    params.onSessionBinding,
    params.onSessionCreated,
    params.onSessionDeleted,
    params.onSessionHistory,
    params.onSessionMessage,
    params.onWorkspaceSnapshot,
  ]);
};

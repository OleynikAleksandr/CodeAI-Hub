import { useEffect } from "react";
import type { SessionMessage, SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";
import type { CoreBridgeSessionMessageTranslationPayload } from "../../../ui/src/core-bridge/types";
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
import { logManagedInputDiagnostic } from "./managed-input-diagnostics";
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
type SessionMessageTranslationUpdate = CoreBridgeSessionMessageTranslationPayload;
type SessionHistoryUpdate = {
  readonly sessionId: string;
  readonly messages: readonly unknown[];
};
type WorkspaceRuntimeSession =
  WorkspaceSnapshotPushPayload["snapshot"]["sessions"][string];

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

const MANAGED_CORE_GATED_LOCK_REASON = "managed_core_gated";

const describeSnapshotInputState = (
  snapshot: SessionSnapshots[string]
): Record<string, unknown> => ({
  connectionState: snapshot.status.connectionState,
  continuityLock: snapshot.status.continuityLock
    ? {
        active: snapshot.status.continuityLock.active,
        reason: snapshot.status.continuityLock.reason ?? null,
        updatedAt: snapshot.status.continuityLock.updatedAt,
      }
    : null,
  taskTimer: snapshot.status.taskTimer ?? null,
});

const describeComputedInputState = (options: {
  readonly connectionState: "idle" | "running" | "blocked";
  readonly lockActive: boolean;
  readonly lockReason: string | undefined;
  readonly timerRunningSinceMs: number | null;
  readonly timerTotalSeconds: number;
}): Record<string, unknown> => ({
  connectionState: options.connectionState,
  continuityLock: {
    active: options.lockActive,
    reason: options.lockReason ?? null,
  },
  taskTimer: {
    runningSinceMs: options.timerRunningSinceMs,
    totalSeconds: options.timerTotalSeconds,
  },
});

const describeWorkspaceSession = (
  session: WorkspaceRuntimeSession
): Record<string, unknown> => ({
  bindingStatus: session.bindingStatus ?? null,
  continuityLockActive: session.continuityLockActive ?? null,
  continuityLockReason: session.continuityLockReason ?? null,
  providerSessionId: readProviderSessionId(session),
  resumeMode: session.resumeMode ?? null,
  turnState: session.turnState ?? null,
});

const logWorkspaceSnapshotInputDecision = (options: {
  readonly after?: Record<string, unknown>;
  readonly before: SessionSnapshots[string];
  readonly event: string;
  readonly incoming?: Record<string, unknown>;
  readonly payload: WorkspaceSnapshotPushPayload;
  readonly session: WorkspaceRuntimeSession;
  readonly sessionId: string;
  readonly targetSnapshotId: string;
}): void => {
  logManagedInputDiagnostic(options.event, {
    after: options.after ?? null,
    before: describeSnapshotInputState(options.before),
    incoming: options.incoming ?? null,
    selectionId: options.payload.selectionId,
    sequence: options.payload.sequence,
    session: describeWorkspaceSession(options.session),
    sessionId: options.sessionId,
    targetSnapshotId: options.targetSnapshotId,
    workspaceRoot: options.payload.workspaceRoot,
  });
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
    let nextLockReason = resolveContinuityLockReason(session) ?? graphHeldReason;
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
    const incomingInputState = describeComputedInputState({
      connectionState: nextConnectionState,
      lockActive: nextLockActive,
      lockReason: nextLockReason,
      timerRunningSinceMs: session.taskTimer?.runningSinceMs ?? null,
      timerTotalSeconds: session.taskTimer?.totalSeconds ?? 0,
    });
    if (
      currentLockActive &&
      currentLockReason === MANAGED_CORE_GATED_LOCK_REASON &&
      !nextLockActive
    ) {
      logWorkspaceSnapshotInputDecision({
        before: current,
        event: "pm.workspace_snapshot.preserved_managed_core_gate",
        incoming: incomingInputState,
        payload,
        session,
        sessionId,
        targetSnapshotId,
      });
      nextLockActive = true;
      nextLockReason = currentLockReason;
      nextConnectionState =
        session.turnState === "running" ||
        current.status.connectionState === "running"
          ? "running"
          : "blocked";
    }
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
      logWorkspaceSnapshotInputDecision({
        before: current,
        event: "pm.workspace_snapshot.blocked_idle_unlock",
        incoming: describeComputedInputState({
          connectionState: nextConnectionState,
          lockActive: nextLockActive,
          lockReason: nextLockReason,
          timerRunningSinceMs: nextTimerRunningSinceMs,
          timerTotalSeconds: nextTimerTotalSeconds,
        }),
        payload,
        session,
        sessionId,
        targetSnapshotId,
      });
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
    const afterInputState = describeComputedInputState({
      connectionState: nextConnectionState,
      lockActive: nextLockActive,
      lockReason: nextLockReason,
      timerRunningSinceMs: nextTimerRunningSinceMs,
      timerTotalSeconds: nextTimerTotalSeconds,
    });
    logWorkspaceSnapshotInputDecision({
      after: afterInputState,
      before: current,
      event: "pm.workspace_snapshot.applied_input_state",
      incoming: incomingInputState,
      payload,
      session,
      sessionId,
      targetSnapshotId,
    });
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

const sanitizeSessionMessageTranslationPayload = (
  payload: unknown
): SessionMessageTranslationUpdate | null => {
  if (!isRecord(payload) || typeof payload.sessionId !== "string") {
    return null;
  }
  if (
    typeof payload.messageId !== "string" ||
    typeof payload.localizedContent !== "string" ||
    typeof payload.sourceHash !== "string" ||
    typeof payload.targetLanguage !== "string"
  ) {
    return null;
  }
  const localizedContent = payload.localizedContent.trim();
  if (localizedContent.length === 0) {
    return null;
  }
  return {
    sessionId: payload.sessionId,
    messageId: payload.messageId,
    localizedContent,
    sourceHash: payload.sourceHash,
    targetLanguage: payload.targetLanguage,
  };
};

export const useProjectManagerSessionStream = (params: {
  readonly onSessionCreated: (session: SessionRecord) => void;
  readonly onSessionMessage: (payload: SessionMessageUpdate) => void;
  readonly onSessionHistory: (payload: SessionHistoryUpdate) => void;
  readonly onSessionBinding: (payload: SessionBindingUpdate) => void;
  readonly onSessionDeleted: (sessionId: string) => void;
  readonly onSessionMessageTranslation?: (
    payload: SessionMessageTranslationUpdate
  ) => void;
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
      if (message.type === "session:message_translation") {
        const normalized = sanitizeSessionMessageTranslationPayload(
          message.payload
        );
        if (normalized) {
          params.onSessionMessageTranslation?.(normalized);
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
    params.onSessionMessageTranslation,
    params.onWorkspaceSnapshot,
  ]);
};

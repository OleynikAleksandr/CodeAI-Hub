import { useEffect } from "react";
import type { SessionMessage, SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";
import {
  sanitizeMessage,
  sanitizeSession,
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
type SessionMessageUpdate = {
  readonly sessionId: string;
  readonly message: SessionMessage;
};
type SessionHistoryUpdate = {
  readonly sessionId: string;
  readonly messages: readonly unknown[];
};
const resolveContinuityLockActive = (
  session: WorkspaceSnapshotPushPayload["snapshot"]["sessions"][string]
): boolean =>
  session.continuityLockActive ||
  session.continuityLockTransition?.awaitingBootstrapTurn === true;
const resolveContinuityLockReason = (
  session: WorkspaceSnapshotPushPayload["snapshot"]["sessions"][string]
): string | undefined =>
  session.continuityLockReason ?? session.continuityLockTransition?.reason;
export const applyWorkspaceSnapshotToSnapshots = (
  snapshots: SessionSnapshots,
  payload: WorkspaceSnapshotPushPayload
): SessionSnapshots => {
  let changed = false;
  const nextSnapshots: SessionSnapshots = { ...snapshots };
  for (const [sessionId, session] of Object.entries(payload.snapshot.sessions)) {
    const current = snapshots[sessionId];
    if (!current) {
      continue;
    }
    const awaitingBootstrapTurn =
      session.continuityLockTransition?.awaitingBootstrapTurn === true;
    let nextLockActive = resolveContinuityLockActive(session);
    const nextLockReason = resolveContinuityLockReason(session);
    let nextConnectionState: "idle" | "running" | "blocked" = nextLockActive
      ? "blocked"
      : session.turnState;
    const currentLockActive = current.status.continuityLock?.active === true;
    const currentLockReason = current.status.continuityLock?.reason;
    const terminalUnlockReason =
      nextLockReason === "resume_ready" ||
      nextLockReason === "resume_failed" ||
      nextLockReason === "resume_timeout";
    if (
      current.status.connectionState === "blocked" &&
      nextConnectionState === "idle" &&
      (!terminalUnlockReason || awaitingBootstrapTurn)
    ) {
      nextLockActive = true;
      nextConnectionState = "blocked";
    }
    if (
      current.status.connectionState === nextConnectionState &&
      currentLockActive === nextLockActive &&
      currentLockReason === nextLockReason
    ) {
      continue;
    }
    changed = true;
    const now = Date.now();
    nextSnapshots[sessionId] = {
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
        updatedAt: now,
      },
    };
  }
  return changed ? nextSnapshots : snapshots;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const resolveServerErrorMessage = (
  payload: unknown
): { readonly sessionId: string; readonly message: string } | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidate = payload as {
    readonly sessionId?: unknown;
    readonly providerId?: unknown;
    readonly message?: unknown;
  };
  const sessionId =
    typeof candidate.sessionId === "string" ? candidate.sessionId : null;
  if (!sessionId) {
    return null;
  }
  const providerLabel =
    typeof candidate.providerId === "string" && candidate.providerId.trim()
      ? `[${candidate.providerId.trim()}] `
      : "";
  const message =
    typeof candidate.message === "string" && candidate.message.trim()
      ? candidate.message.trim()
      : "Unknown error.";
  return { sessionId, message: `${providerLabel}${message}` };
};
const generateLocalMessageId = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
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
        const candidate = message.payload as {
          readonly sessionId?: unknown;
          readonly message?: unknown;
        };
        if (isRecord(candidate) && isRecord(candidate.message)) {
          const sessionId =
            typeof candidate.sessionId === "string" ? candidate.sessionId : null;
          const sanitized = sanitizeMessage({
            sessionId,
            ...(candidate.message as Record<string, unknown>),
          } as never);
          if (sessionId && sanitized) {
            params.onSessionMessage({ sessionId, message: sanitized });
          }
          return;
        }
        const sanitized = sanitizeMessage(message.payload as never);
        if (sanitized && typeof candidate?.sessionId === "string") {
          params.onSessionMessage({
            sessionId: candidate.sessionId,
            message: sanitized,
          });
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
        const payload = message.payload as {
          readonly sessionId?: unknown;
          readonly providerSessionId?: unknown;
          readonly status?: unknown;
        };
        const sessionId =
          payload && typeof payload.sessionId === "string" ? payload.sessionId : null;
        if (!sessionId) {
          return;
        }
        const providerSessionId =
          payload &&
          (payload.providerSessionId === null ||
            typeof payload.providerSessionId === "string")
            ? (payload.providerSessionId as string | null)
            : null;
        const status =
          payload &&
          (payload.status === "pending" ||
            payload.status === "ready" ||
            payload.status === "failed")
            ? payload.status
            : "pending";
        params.onSessionBinding({ sessionId, providerSessionId, status });
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
        const resolved = resolveServerErrorMessage(message.payload);
        if (!resolved) {
          return;
        }
        params.onSessionMessage({
          sessionId: resolved.sessionId,
          message: {
            id: generateLocalMessageId(),
            role: "system",
            content: resolved.message,
            createdAt: Date.now(),
          },
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

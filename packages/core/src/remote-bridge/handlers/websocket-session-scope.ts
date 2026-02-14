import { isAbsolute } from "node:path";
import type { BridgeEvent } from "../types";

export type ClientScopeState = {
  readonly enabled: boolean;
  readonly workspacePath: string | null;
};

export type ParsedWorkspaceScopeSetPayload =
  | {
      readonly ok: true;
      readonly requestId: string;
      readonly workspacePath: string | null;
    }
  | {
      readonly ok: false;
      readonly requestId: string;
      readonly error: string;
    };

export const parseWorkspaceScopeSetPayload = (
  payload: unknown
): ParsedWorkspaceScopeSetPayload => {
  const rawRequestId =
    payload && typeof payload === "object" && "requestId" in payload
      ? payload.requestId
      : undefined;
  const requestId =
    typeof rawRequestId === "string" && rawRequestId.trim().length > 0
      ? rawRequestId.trim()
      : "invalid-request";
  const reject = (error: string): ParsedWorkspaceScopeSetPayload => ({
    ok: false,
    requestId,
    error,
  });
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return reject("Invalid scope payload");
  }
  const record = payload as {
    readonly workspacePath?: unknown;
    readonly reason?: unknown;
  };
  if (
    record.reason !== "workspace_selected" &&
    record.reason !== "reconnect" &&
    record.reason !== "workspace_cleared"
  ) {
    return reject("Invalid scope reason");
  }
  let workspacePath: string | null = null;
  if (record.workspacePath !== null && record.workspacePath !== undefined) {
    if (typeof record.workspacePath !== "string") {
      return reject("workspacePath must be string or null");
    }
    const trimmed = record.workspacePath.trim();
    if (!(trimmed && isAbsolute(trimmed))) {
      return reject("workspacePath must be absolute");
    }
    workspacePath = trimmed;
  }
  return { ok: true, requestId, workspacePath };
};

export const isSessionEvent = (event: BridgeEvent): boolean =>
  event.type === "session:created" ||
  event.type === "session:message" ||
  event.type === "session:binding" ||
  event.type === "session:deleted" ||
  event.type === "session:stream" ||
  event.type === "session:error" ||
  event.type === "dialog:message";

export const resolveEventSessionId = (event: BridgeEvent): string | null => {
  if (
    event.type === "session:binding" ||
    event.type === "session:deleted" ||
    event.type === "session:stream"
  ) {
    return event.payload.sessionId;
  }
  if (event.type === "session:error" || event.type === "session:message") {
    const payload = event.payload as { readonly sessionId?: unknown };
    return typeof payload?.sessionId === "string" ? payload.sessionId : null;
  }
  if (event.type === "dialog:message") {
    const payload = event.payload as { readonly sessionId?: unknown };
    return typeof payload?.sessionId === "string" ? payload.sessionId : null;
  }
  return null;
};

export const resolveEventWorkspacePath = (
  event: BridgeEvent,
  sessionWorkspaceById: ReadonlyMap<string, string>
): string | null => {
  if (event.type === "session:created") {
    return event.payload.workspacePath;
  }
  const sessionId = resolveEventSessionId(event);
  if (!sessionId) {
    return null;
  }
  return sessionWorkspaceById.get(sessionId) ?? null;
};

/**
 * @deprecated Phase 105+: keep only for transition while legacy
 * `workspace:scope:set` clients are still supported.
 */
export const shouldDeliverEventForScope = (params: {
  readonly event: BridgeEvent;
  readonly scope: ClientScopeState;
  readonly sessionWorkspaceById: ReadonlyMap<string, string>;
}): boolean => {
  if (!isSessionEvent(params.event)) {
    return true;
  }
  if (!params.scope.enabled) {
    return true;
  }
  if (!params.scope.workspacePath) {
    return false;
  }
  const workspacePath = resolveEventWorkspacePath(
    params.event,
    params.sessionWorkspaceById
  );
  return workspacePath === params.scope.workspacePath;
};

export const shouldDeliverTokenUsageForScope = (params: {
  readonly scope: ClientScopeState;
  readonly sessionId: string;
  readonly sessionWorkspaceById: ReadonlyMap<string, string>;
}): boolean => {
  if (!params.scope.enabled) {
    return true;
  }
  if (!params.scope.workspacePath) {
    return false;
  }
  return (
    params.sessionWorkspaceById.get(params.sessionId) ===
    params.scope.workspacePath
  );
};

/**
 * @deprecated Phase 105+: keep only for legacy scoped-delivery bookkeeping.
 * New routing should rely on `workspace:select` and workspace runtime snapshots.
 */
export const recordSessionWorkspaceSnapshot = (params: {
  readonly event: BridgeEvent;
  readonly sessionWorkspaceById: Map<string, string>;
}): void => {
  if (params.event.type === "core:state") {
    for (const session of params.event.payload.sessions) {
      params.sessionWorkspaceById.set(session.id, session.workspacePath);
    }
    return;
  }
  if (params.event.type === "session:created") {
    params.sessionWorkspaceById.set(
      params.event.payload.id,
      params.event.payload.workspacePath
    );
  }
};

export const finalizeSessionWorkspaceSnapshot = (params: {
  readonly event: BridgeEvent;
  readonly sessionWorkspaceById: Map<string, string>;
}): void => {
  if (params.event.type === "session:deleted") {
    params.sessionWorkspaceById.delete(params.event.payload.sessionId);
  }
};

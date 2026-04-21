import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type { SessionTurnState } from "../../workspace-runtime/workspace-runtime-types";
import type { BridgeEvent } from "../types";

interface ProviderSessionBindingLike {
  readonly providerId: string;
  providerSessionId: string;
  readonly unsubscribe: () => void;
}

interface SessionProviderBindingServiceDependencies {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly continuity: SessionContinuityFacade;
  readonly logger: Logger;
  readonly providerSessions: Map<string, ProviderSessionBindingLike>;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly stateBroadcaster: () => void;
  readonly updateDescriptionSessionRef: (
    session: Session,
    providerSessionId?: string
  ) => Promise<void>;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
}

export type UsageTelemetryLifecycleTrigger =
  | "binding_ready"
  | "dialog_opened"
  | "manual"
  | "provider_session_rebound"
  | "reconnect"
  | "session_opened"
  | "turn_completed";

interface UsageLimitsPayloadLike {
  readonly data?: {
    readonly kind?: string;
  } | null;
  readonly providerScopeKey?: string | null;
  readonly usageLimits?: unknown;
}

interface UsageLimitsFacadeLike {
  getCachedStreamPayload(params: {
    readonly providerSessionId: string | null;
  }): UsageLimitsPayloadLike | null;
}

interface UsageLimitsCacheAdapterLike {
  readonly usageLimitsFacade?: UsageLimitsFacadeLike;
}

interface WorkspaceRuntimeSnapshotLike {
  readonly sessions?: Readonly<
    Record<
      string,
      {
        readonly turnState?: SessionTurnState;
      }
    >
  >;
}

export const resolveCachedUsageLimitsStreamEvent = (params: {
  readonly adapter: unknown;
  readonly providerSessionId: string;
}): Record<string, unknown> | null => {
  const facade = (params.adapter as UsageLimitsCacheAdapterLike | undefined)
    ?.usageLimitsFacade;
  const payload =
    facade?.getCachedStreamPayload({
      providerSessionId: params.providerSessionId,
    }) ?? null;
  if (payload?.data?.kind !== "usage_limits") {
    return null;
  }

  return {
    type: "stream_event",
    providerSessionId: params.providerSessionId,
    providerScopeKey: payload.providerScopeKey ?? null,
    usageLimits: payload.usageLimits ?? null,
    data: payload.data,
    timestamp: new Date().toISOString(),
    uuid: `replay::usage_limits::${params.providerSessionId}`,
  };
};

export const normalizeUsageLimitsStreamEvent = (params: {
  readonly event: unknown;
  readonly providerSessionId: string;
}): Record<string, unknown> | null => {
  if (
    !params.event ||
    typeof params.event !== "object" ||
    Array.isArray(params.event)
  ) {
    return null;
  }
  const record = params.event as Record<string, unknown>;
  const data =
    record.data &&
    typeof record.data === "object" &&
    !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : null;
  if (data?.kind !== "usage_limits") {
    return null;
  }

  return {
    ...record,
    type: "stream_event",
    providerSessionId:
      typeof record.providerSessionId === "string" &&
      record.providerSessionId.trim().length > 0
        ? record.providerSessionId
        : params.providerSessionId,
    timestamp:
      typeof record.timestamp === "string" && record.timestamp.trim().length > 0
        ? record.timestamp
        : new Date().toISOString(),
    uuid:
      typeof record.uuid === "string" && record.uuid.trim().length > 0
        ? record.uuid
        : `refresh::usage_limits::${params.providerSessionId}::${Date.now()}`,
  };
};

export const resolveRuntimeTurnState = (params: {
  readonly session: Session;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
}): SessionTurnState | null => {
  const runtime = params.workspaceRuntime as
    | {
        getSnapshot?: (workspaceRoot: string) => WorkspaceRuntimeSnapshotLike;
      }
    | undefined;
  if (typeof runtime?.getSnapshot !== "function") {
    return null;
  }

  const turnState = runtime.getSnapshot(params.session.workspacePath)
    ?.sessions?.[params.session.id]?.turnState;
  return turnState === "idle" || turnState === "running" ? turnState : null;
};

export const shouldDispatchUsageLimitsRefresh = (params: {
  readonly cachedReplayAvailable: boolean;
  readonly lifecycleTrigger: UsageTelemetryLifecycleTrigger | null;
  readonly runtimeTurnState: SessionTurnState | null;
}): boolean => {
  if (
    params.lifecycleTrigger === "manual" ||
    params.lifecycleTrigger === "turn_completed"
  ) {
    return true;
  }

  if (
    params.lifecycleTrigger === "binding_ready" ||
    params.lifecycleTrigger === "dialog_opened" ||
    params.lifecycleTrigger === "provider_session_rebound" ||
    params.lifecycleTrigger === "reconnect" ||
    params.lifecycleTrigger === "session_opened"
  ) {
    return !params.cachedReplayAvailable;
  }

  if (params.cachedReplayAvailable) {
    return false;
  }

  if (params.runtimeTurnState === "idle") {
    return false;
  }

  return true;
};

export class SessionProviderBindingService {
  private readonly deps: SessionProviderBindingServiceDependencies;
  private readonly bindingBroadcastListeners = new Set<
    (sessionId: string) => void
  >();
  private readonly preStopProviderSessionIdBySession = new Map<
    string,
    string
  >();
  private readonly usageTelemetryLifecycleKeyBySessionId = new Map<
    string,
    string
  >();

  constructor(deps: SessionProviderBindingServiceDependencies) {
    this.deps = deps;
  }

  getPreStopProviderSessionId(sessionId: string): string | null {
    return this.preStopProviderSessionIdBySession.get(sessionId) ?? null;
  }

  clearPreStopProviderSessionId(sessionId: string): void {
    this.preStopProviderSessionIdBySession.delete(sessionId);
  }

  clearUsageTelemetryLifecycle(sessionId: string): void {
    this.usageTelemetryLifecycleKeyBySessionId.delete(sessionId);
  }

  registerBindingBroadcastListener(
    listener: (sessionId: string) => void
  ): () => void {
    this.bindingBroadcastListeners.add(listener);
    return () => {
      this.bindingBroadcastListeners.delete(listener);
    };
  }

  consumeUsageTelemetryBindingBootstrap(sessionId: string): Session | null {
    const session = this.deps.sessionManager.getSession(sessionId);
    const lifecycleKey = this.resolveUsageTelemetryLifecycleKey(session);
    if (!lifecycleKey) {
      this.usageTelemetryLifecycleKeyBySessionId.delete(sessionId);
      return null;
    }
    if (
      this.usageTelemetryLifecycleKeyBySessionId.get(sessionId) === lifecycleKey
    ) {
      return null;
    }

    this.usageTelemetryLifecycleKeyBySessionId.set(sessionId, lifecycleKey);
    return session ?? null;
  }

  updateProviderBinding(sessionId: string, providerSessionId?: string): void {
    if (!providerSessionId) {
      return;
    }
    const binding = this.deps.providerSessions.get(sessionId);
    if (binding) {
      binding.providerSessionId = providerSessionId;
    }
  }

  registerRestoredBinding(options: {
    readonly sessionId: string;
    readonly providerId: string;
    readonly providerSessionId: string;
  }): void {
    if (this.deps.providerSessions.has(options.sessionId)) {
      return;
    }
    this.deps.providerSessions.set(options.sessionId, {
      providerId: options.providerId,
      providerSessionId: options.providerSessionId,
      unsubscribe: () => {
        // Paper binding: no adapter subscription was created, so nothing
        // to tear down. Present here so invalidateProviderBinding can call
        // unsubscribe() uniformly.
      },
    });
  }

  updateBindingWithResolvedId(
    sessionId: string,
    providerSessionId: string
  ): void {
    const session = this.deps.sessionManager.getSession(sessionId);
    if (
      !session ||
      (session.providerSessionStatus === "ready" &&
        session.providerSessionId === providerSessionId)
    ) {
      return;
    }

    this.deps.sessionManager.updateProviderSessionId(
      sessionId,
      providerSessionId
    );
    this.deps.sessionStorage.promote(sessionId, providerSessionId);
    this.updateProviderBinding(sessionId, providerSessionId);
    this.deps.continuity.updateProviderSessionId(sessionId, providerSessionId);
    this.deps
      .updateDescriptionSessionRef(session, providerSessionId)
      .catch((error: unknown) => {
        this.deps.logger.warn(
          "Failed to persist updated description session ref",
          {
            sessionId,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      });
    this.broadcastSessionBinding(sessionId);
  }

  invalidateProviderBinding(sessionId: string): void {
    this.usageTelemetryLifecycleKeyBySessionId.delete(sessionId);
    const session = this.deps.sessionManager.getSession(sessionId);
    const preStopProviderSessionId = session?.providerSessionId?.trim();
    if (preStopProviderSessionId && preStopProviderSessionId.length > 0) {
      this.preStopProviderSessionIdBySession.set(
        sessionId,
        preStopProviderSessionId
      );
    }

    const binding = this.deps.providerSessions.get(sessionId);
    if (binding) {
      binding.unsubscribe();
      this.deps.providerSessions.delete(sessionId);
    }
    this.deps.sessionManager.invalidateProviderBinding(sessionId);
    this.broadcastSessionBinding(sessionId);
  }

  broadcastSessionBinding(sessionId: string): void {
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }
    this.deps.broadcaster({
      type: "session:binding",
      payload: {
        sessionId,
        providerSessionId: session.providerSessionId ?? null,
        status: session.providerSessionStatus,
      },
    });
    this.deps.workspaceRuntime?.notifyBindingChanged(
      {
        workspaceRoot: session.workspacePath,
        nodeId: session.stage ?? "session",
        sessionId: session.id,
      },
      {
        providerId: session.providerId,
        providerSessionId: session.providerSessionId ?? null,
        bindingStatus: session.providerSessionStatus,
      }
    );
    this.deps.stateBroadcaster();
    for (const listener of this.bindingBroadcastListeners) {
      listener(sessionId);
    }

    const providerSessionId = session.providerSessionId ?? null;
    const workspaceSlug = session.initiativeSlug ?? null;
    if (!(providerSessionId && workspaceSlug)) {
      return;
    }

    SessionContinuityFacade.readLastTokenUsageSnapshot({
      workspaceRoot: session.workspacePath,
      workspaceSlug,
      providerSessionId,
    })
      .then((snapshot) => {
        if (!snapshot) {
          return;
        }
        this.deps.broadcaster({
          type: "session:stream",
          payload: {
            sessionId,
            event: {
              type: "stream_event",
              providerSessionId,
              tokenUsage: { used: snapshot.used, limit: snapshot.limit },
              data: {
                kind: "token_usage",
                used: snapshot.used,
                limit: snapshot.limit,
              },
              uuid: "continuity::token_usage",
              timestamp: snapshot.updatedAt,
            },
          },
        });
      })
      .catch((error: unknown) => {
        this.deps.logger.warn(
          "Failed to load token usage snapshot from continuity",
          {
            sessionId,
            providerSessionId,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      });
  }

  private resolveUsageTelemetryLifecycleKey(
    session: Session | undefined
  ): string | null {
    if (session?.providerSessionStatus !== "ready") {
      return null;
    }
    const providerSessionId = session.providerSessionId?.trim();
    if (!providerSessionId) {
      return null;
    }
    return `${session.providerId}::${providerSessionId}`;
  }
}

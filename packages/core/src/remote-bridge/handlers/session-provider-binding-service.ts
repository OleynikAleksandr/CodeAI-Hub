import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type { BridgeEvent } from "../types";

type ProviderSessionBindingLike = {
  readonly providerId: string;
  providerSessionId: string;
  readonly unsubscribe: () => void;
};

type SessionProviderBindingServiceDependencies = {
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly continuity: SessionContinuityFacade;
  readonly providerSessions: Map<string, ProviderSessionBindingLike>;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly stateBroadcaster: () => void;
  readonly logger: Logger;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
  readonly updateDescriptionSessionRef: (
    session: Session,
    providerSessionId?: string
  ) => Promise<void>;
};

export class SessionProviderBindingService {
  private readonly deps: SessionProviderBindingServiceDependencies;

  constructor(deps: SessionProviderBindingServiceDependencies) {
    this.deps = deps;
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
}

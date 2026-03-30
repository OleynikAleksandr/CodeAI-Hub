import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type { BridgeEvent } from "../types";

interface ProviderEventEnvelope {
  readonly payload?: unknown;
  readonly type?: string;
}

interface DialogMessagePayload {
  readonly content?: unknown;
  readonly role?: string;
  readonly tag?: string;
  readonly timestamp?: string;
}

interface SessionIdChangedPayload {
  readonly newId?: string;
}

interface ProviderErrorEnvelope {
  readonly error?: unknown;
  readonly message?: unknown;
  readonly payload?: unknown;
  readonly provider?: unknown;
}

interface SessionProviderEventRouterDependencies {
  readonly appendDialogMessage: (
    sessionId: string,
    payload: DialogMessagePayload
  ) => void;
  readonly appendProviderMessage: (
    sessionId: string,
    role: "assistant" | "system" | "thinking",
    event: unknown
  ) => void;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly clearPostTurnContextDecision: (sessionId: string) => void;
  readonly emitTurnStateEvent: (options: {
    readonly sessionId: string;
    readonly state: "idle" | "running";
  }) => void;
  readonly finalizeFlowNodeContinuityLockOnBootstrapGate: (options: {
    readonly sessionId: string;
    readonly reason: "resume_ready" | "resume_failed" | "resume_timeout";
  }) => void;
  readonly handleFlowNodeContinuityProviderEvent: (
    sessionId: string,
    event: unknown
  ) => Promise<void>;
  readonly handleSessionContinuityProviderEvent: (
    sessionId: string,
    event: unknown
  ) => Promise<void>;
  readonly handleTurnCompletedWithFlowNodeArbitration: (
    sessionId: string,
    flowNodeContinuityTask: Promise<void>
  ) => void;
  readonly logger: Logger;
  readonly markPostTurnContextDecisionPending: (sessionId: string) => void;
  readonly sessionManager: SessionManager;
  readonly updateBindingWithResolvedId: (
    sessionId: string,
    providerSessionId: string
  ) => void;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
}

export class SessionProviderEventRouter {
  private readonly deps: SessionProviderEventRouterDependencies;

  constructor(deps: SessionProviderEventRouterDependencies) {
    this.deps = deps;
  }

  handleProviderEvent(sessionId: string, event: unknown): void {
    this.deps
      .handleSessionContinuityProviderEvent(sessionId, event)
      .catch((error: unknown) => {
        this.deps.logger.warn("Session continuity handler failed", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    if (typeof event === "string") {
      this.routeUntypedProviderEvent(sessionId, event);
      this.deps.updateBindingWithResolvedId(sessionId, event);
      return;
    }
    if (!event || typeof event !== "object") {
      this.routeUntypedProviderEvent(sessionId, event);
      return;
    }

    const typedEvent = event as ProviderEventEnvelope;
    if (typedEvent.type === "turn_completed") {
      this.deps.markPostTurnContextDecisionPending(sessionId);
    }

    const flowNodeContinuityTask =
      this.deps.handleFlowNodeContinuityProviderEvent(sessionId, event);
    if (typedEvent.type === "turn_completed") {
      this.deps.broadcaster({
        type: "session:stream",
        payload: { sessionId, event: typedEvent },
      });
      this.deps.handleTurnCompletedWithFlowNodeArbitration(
        sessionId,
        flowNodeContinuityTask
      );
      return;
    }

    flowNodeContinuityTask.catch((error: unknown) => {
      this.logFlowNodeContinuityHandlerFailure(sessionId, error);
    });
    this.handleTypedProviderEvent(sessionId, typedEvent);
  }

  private routeUntypedProviderEvent(sessionId: string, event: unknown): void {
    this.deps
      .handleFlowNodeContinuityProviderEvent(sessionId, event)
      .catch((error: unknown) => {
        this.logFlowNodeContinuityHandlerFailure(sessionId, error);
      });
  }

  private logFlowNodeContinuityHandlerFailure(
    sessionId: string,
    error: unknown
  ): void {
    this.deps.logger.warn("Flow node continuity handler failed", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  private handleTypedProviderEvent(
    sessionId: string,
    event: ProviderEventEnvelope
  ): void {
    switch (event.type) {
      case "sessionIdChanged":
        this.handleSessionIdChangedEvent(sessionId, event.payload);
        break;
      case "realSessionId":
        this.handleRealSessionIdEvent(sessionId, event.payload);
        break;
      case "turn_started":
        this.deps.emitTurnStateEvent({ sessionId, state: "running" });
        break;
      case "turn_failed":
        this.deps.clearPostTurnContextDecision(sessionId);
        this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
        this.deps.finalizeFlowNodeContinuityLockOnBootstrapGate({
          sessionId,
          reason: "resume_failed",
        });
        this.appendTurnFailureHistoryMessage(sessionId, event);
        this.broadcastProviderError(sessionId, event);
        break;
      case "stream_error":
      case "error":
        this.deps.finalizeFlowNodeContinuityLockOnBootstrapGate({
          sessionId,
          reason: "resume_failed",
        });
        this.broadcastProviderError(sessionId, event);
        break;
      case "stream_event":
        this.recordStreamHeartbeat(sessionId);
        this.deps.broadcaster({
          type: "session:stream",
          payload: { sessionId, event },
        });
        break;
      case "assistant":
        this.deps.appendProviderMessage(sessionId, "assistant", event);
        break;
      case "thinking":
        this.deps.appendProviderMessage(sessionId, "thinking", event);
        break;
      case "dialog_message":
        this.deps.appendDialogMessage(sessionId, event as DialogMessagePayload);
        break;
      case "system":
        this.deps.appendProviderMessage(sessionId, "system", event);
        this.broadcastRuntimeModelUpdate(sessionId, event);
        break;
      default:
        break;
    }
  }

  private recordStreamHeartbeat(sessionId: string): void {
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }
    this.deps.workspaceRuntime?.recordHeartbeat({
      workspaceRoot: session.workspacePath,
      nodeId: session.stage ?? "session",
      sessionId: session.id,
    });
  }

  private broadcastRuntimeModelUpdate(
    sessionId: string,
    event: ProviderEventEnvelope
  ): void {
    const data = (event as { readonly data?: unknown }).data;
    if (!data || typeof data !== "object") {
      return;
    }
    const modelId = (data as { readonly model?: unknown }).model;
    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      return;
    }
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }
    this.deps.broadcaster({
      type: "session:model:update",
      payload: {
        sessionId,
        providerId: session.providerId,
        modelId: modelId.trim(),
      },
    });
  }

  private broadcastProviderError(
    sessionId: string,
    event: ProviderEventEnvelope
  ): void {
    const typed = event as ProviderErrorEnvelope;
    const providerId =
      typeof typed.provider === "string" && typed.provider.trim().length > 0
        ? typed.provider.trim()
        : null;
    this.deps.broadcaster({
      type: "session:error",
      payload: {
        sessionId,
        providerId,
        message: this.extractProviderErrorMessage(typed),
      },
    });
  }

  private appendTurnFailureHistoryMessage(
    sessionId: string,
    event: ProviderEventEnvelope
  ): void {
    const message = this.extractProviderErrorMessage(event);
    if (!message) {
      return;
    }
    this.deps.appendProviderMessage(sessionId, "system", {
      content: `Provider turn failed: ${message}`,
      ...(typeof (event as { readonly timestamp?: unknown }).timestamp ===
      "string"
        ? { timestamp: (event as { readonly timestamp?: string }).timestamp }
        : {}),
    });
  }

  private extractProviderErrorMessage(event: ProviderErrorEnvelope): string {
    if (typeof event.message === "string" && event.message.trim().length > 0) {
      return event.message.trim();
    }
    if (typeof event.error === "string" && event.error.trim().length > 0) {
      return event.error.trim();
    }
    if (event.error && typeof event.error === "object") {
      const candidate = event.error as { readonly message?: unknown };
      if (
        typeof candidate.message === "string" &&
        candidate.message.trim().length > 0
      ) {
        return candidate.message.trim();
      }
      return JSON.stringify(event.error);
    }
    if (event.payload && typeof event.payload === "object") {
      const candidate = event.payload as { readonly message?: unknown };
      if (
        typeof candidate.message === "string" &&
        candidate.message.trim().length > 0
      ) {
        return candidate.message.trim();
      }
      return JSON.stringify(event.payload);
    }
    return "Provider error.";
  }

  private handleSessionIdChangedEvent(
    sessionId: string,
    payload: unknown
  ): void {
    const typed = payload as SessionIdChangedPayload;
    if (typed?.newId) {
      this.deps.updateBindingWithResolvedId(sessionId, typed.newId);
    }
  }

  private handleRealSessionIdEvent(sessionId: string, payload: unknown): void {
    const typed = payload as { readonly sessionId?: unknown };
    if (typeof typed?.sessionId === "string") {
      this.deps.updateBindingWithResolvedId(sessionId, typed.sessionId);
    }
  }
}

import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import { type BridgeEvent, serializeSessionModelBinding } from "../types";
import { runManagedArbitrationWithTimeBox } from "./managed-arbitration-time-box";
import { ManagedCoreGatedLockController } from "./managed-core-gated-lock-controller";
import { formatCodexAuthRecoveryMessage } from "./session-provider-event-auth-recovery";
import {
  isRecord,
  readProviderEventStableId,
  readStringField,
} from "./session-provider-event-identity";
import type { ManagedWorkflowTurnCompletionResult } from "./session-request-handler-managed-workflow-turn";
import { recordSessionStreamHeartbeat } from "./session-stream-heartbeat";

interface ProviderEventEnvelope {
  readonly payload?: unknown;
  readonly type?: string;
}

interface DialogMessagePayload {
  readonly content?: unknown;
  readonly role?: string;
  readonly tag?: string;
  readonly timestamp?: string;
  readonly uuid?: string;
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
  readonly handleManagedWorkflowTurnCompleted?: (
    sessionId: string
  ) => Promise<ManagedWorkflowTurnCompletionResult | undefined>;
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
  readonly resolveEffectiveModelId?: (options: {
    readonly providerId: string;
    readonly targetModelId: string;
  }) => string | undefined;
  readonly sessionManager: SessionManager;
  readonly updateBindingWithResolvedId: (
    sessionId: string,
    providerSessionId: string
  ) => void;
  readonly waitForProviderMessagePersistence: (
    sessionId: string
  ) => Promise<void>;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
}

const TERMINAL_EVENT_TYPES = new Set(["turn_completed", "turn_failed"]);

export class SessionProviderEventRouter {
  private readonly deps: SessionProviderEventRouterDependencies;
  private readonly processedTerminalEvents = new Map<string, Set<string>>();
  private readonly terminalEventCounters = new Map<string, number>();
  private readonly managedCoreGatedLock: ManagedCoreGatedLockController;

  constructor(deps: SessionProviderEventRouterDependencies) {
    this.deps = deps;
    this.managedCoreGatedLock = new ManagedCoreGatedLockController(deps);
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
    if (
      typeof typedEvent.type === "string" &&
      TERMINAL_EVENT_TYPES.has(typedEvent.type) &&
      !(
        typedEvent.type === "turn_completed" &&
        this.managedCoreGatedLock.isLocked(sessionId)
      ) &&
      this.isDuplicateTerminalEvent(sessionId, typedEvent)
    ) {
      this.deps.logger.debug(
        "Skipping duplicate terminal provider event for continuity arbitration",
        { sessionId, eventType: typedEvent.type }
      );
      return;
    }
    if (typedEvent.type === "turn_completed") {
      this.deps.markPostTurnContextDecisionPending(sessionId);
    }

    const flowNodeContinuityTask =
      this.deps.handleFlowNodeContinuityProviderEvent(sessionId, event);
    if (typedEvent.type === "turn_completed") {
      this.handleTurnCompletedAfterMessageFlush(
        sessionId,
        typedEvent,
        flowNodeContinuityTask
      );
      return;
    }

    flowNodeContinuityTask.catch((error: unknown) => {
      this.logFlowNodeContinuityHandlerFailure(sessionId, error);
    });
    this.handleTypedProviderEvent(sessionId, typedEvent);
  }

  private isDuplicateTerminalEvent(
    sessionId: string,
    event: ProviderEventEnvelope
  ): boolean {
    const identity = this.computeTerminalEventIdentity(sessionId, event);
    let processed = this.processedTerminalEvents.get(sessionId);
    if (!processed) {
      processed = new Set();
      this.processedTerminalEvents.set(sessionId, processed);
    }
    if (processed.has(identity)) {
      return true;
    }
    processed.add(identity);
    return false;
  }

  private computeTerminalEventIdentity(
    sessionId: string,
    event: ProviderEventEnvelope
  ): string {
    const providerStableId = readProviderEventStableId(event);
    if (providerStableId) {
      return `${sessionId}::${event.type}::provider:${providerStableId}`;
    }
    const next = (this.terminalEventCounters.get(sessionId) ?? 0) + 1;
    this.terminalEventCounters.set(sessionId, next);
    return `${sessionId}::${event.type}::core:${next}`;
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
      case "user_input":
        this.appendDeferredUserInput(sessionId, event);
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
        recordSessionStreamHeartbeat(this.deps, sessionId);
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
      case "model_info":
        this.broadcastRuntimeModelUpdate(sessionId, event);
        break;
      default:
        break;
    }
  }

  private handleTurnCompletedAfterMessageFlush(
    sessionId: string,
    event: ProviderEventEnvelope,
    flowNodeContinuityTask: Promise<void>
  ): void {
    this.deps
      .waitForProviderMessagePersistence(sessionId)
      .catch((error: unknown) => {
        this.deps.logger.warn(
          "Provider message persistence flush failed before turn completion",
          {
            sessionId,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      })
      .finally(() => {
        if (this.managedCoreGatedLock.lockForCoreArbitration(sessionId)) {
          this.deps.emitTurnStateEvent({ sessionId, state: "running" });
        }
        this.deps.broadcaster({
          type: "session:stream",
          payload: { sessionId, event },
        });
        runManagedArbitrationWithTimeBox(
          this.deps,
          sessionId,
          this.deps.handleManagedWorkflowTurnCompleted?.(sessionId) ??
            Promise.resolve<ManagedWorkflowTurnCompletionResult | undefined>(
              "settled"
            )
        )
          .catch((error: unknown) => {
            const message =
              error instanceof Error ? error.message : String(error);
            this.deps.logger.error(
              "Managed workflow turn completion handler failed",
              error instanceof Error ? error : new Error(message),
              { sessionId }
            );
            this.deps.appendProviderMessage(sessionId, "system", {
              content: [
                `Core could not finish processing this turn: ${message}`,
                "The input is released. Send any message to continue; Core will re-validate the workflow state and dispatch the next step.",
              ].join("\n"),
            });
            return "settled" as const;
          })
          .then((managedResult) => {
            this.managedCoreGatedLock.apply(sessionId, managedResult);
            if (managedResult === "continued") {
              flowNodeContinuityTask.catch((error: unknown) => {
                this.logFlowNodeContinuityHandlerFailure(sessionId, error);
              });
              return;
            }
            this.deps.handleTurnCompletedWithFlowNodeArbitration(
              sessionId,
              flowNodeContinuityTask
            );
          });
      });
  }

  private appendDeferredUserInput(
    sessionId: string,
    event: ProviderEventEnvelope
  ): void {
    const eventRecord = event as unknown as Record<string, unknown>;
    const data = isRecord(eventRecord.data) ? eventRecord.data : null;
    const visibility =
      readStringField(eventRecord, "userMessageVisibility") ??
      readStringField(data, "userMessageVisibility");
    if (visibility !== "deferred") {
      return;
    }
    const content = readStringField(eventRecord, "content");
    if (!content || content.trim().length === 0) {
      return;
    }
    this.deps.appendDialogMessage(sessionId, {
      content,
      role: "user",
      tag: "core-deferred-user",
      timestamp: readStringField(eventRecord, "timestamp") ?? undefined,
      uuid: readStringField(eventRecord, "uuid") ?? undefined,
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
    const rawModelId = modelId.trim();
    const bindingEffectiveModelId =
      session.modelBinding?.providerId === session.providerId &&
      (session.modelBinding.baseModelId === rawModelId ||
        session.modelBinding.modelId === rawModelId)
        ? session.modelBinding.modelId
        : null;
    const effectiveModelId =
      bindingEffectiveModelId ??
      this.deps.resolveEffectiveModelId?.({
        providerId: session.providerId,
        targetModelId: rawModelId,
      }) ??
      rawModelId;
    this.deps.broadcaster({
      type: "session:model:update",
      payload: {
        sessionId,
        providerId: session.providerId,
        baseModelId: rawModelId,
        modelId: effectiveModelId,
        modelBinding: serializeSessionModelBinding(session) ?? undefined,
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
    const session = this.deps.sessionManager.getSession(sessionId);
    const recoveryMessage = formatCodexAuthRecoveryMessage({
      message,
      providerId: session?.providerId,
    });
    this.deps.appendProviderMessage(sessionId, "system", {
      content: recoveryMessage ?? `Provider turn failed: ${message}`,
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

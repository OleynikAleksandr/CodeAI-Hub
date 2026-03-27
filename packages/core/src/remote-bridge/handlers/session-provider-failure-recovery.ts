import type { ProviderRegistry } from "../../provider-registry";
import { buildSwitchOfferPayload } from "../../recovery/failure-recovery-bridge";
import { classifyProviderFailure } from "../../recovery/provider-failure-classifier";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { BridgeEvent } from "../types";

interface ProviderSessionBindingLike {
  readonly providerId: string;
  providerSessionId: string;
  readonly unsubscribe: () => void;
}

type ProviderFailureClassification = ReturnType<typeof classifyProviderFailure>;

interface SessionProviderFailureRecoveryDependencies {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly broadcastSessionBinding: (sessionId: string) => void;
  readonly consumeRetryBudget: (
    sessionId: string,
    failureClass: string
  ) => void;
  readonly emitTurnStateEvent: (options: {
    readonly sessionId: string;
    readonly state: "idle" | "running";
  }) => void;
  readonly expirePendingUserIntent: (sessionId: string) => void;
  readonly logger: Logger;
  readonly providerRegistry: ProviderRegistry;
  readonly providerSessions: Map<string, ProviderSessionBindingLike>;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly stateBroadcaster: () => void;
}

export class SessionProviderFailureRecovery {
  private readonly deps: SessionProviderFailureRecoveryDependencies;

  constructor(deps: SessionProviderFailureRecoveryDependencies) {
    this.deps = deps;
  }

  handleProviderFailure(
    providerId: string,
    error: unknown,
    sessionId?: string
  ): void {
    const binding = sessionId
      ? this.deps.providerSessions.get(sessionId)
      : undefined;
    const adapter = this.deps.providerRegistry.getAdapter(providerId);
    const classification = classifyProviderFailure(error, {
      hasBinding: Boolean(binding),
      hasProviderSessionId: Boolean(binding?.providerSessionId),
      adapterAvailable: Boolean(adapter),
    });

    this.deps.logger.error(
      `Provider operation failed [${classification.failureClass}]`,
      error instanceof Error ? error : new Error(String(error)),
      {
        providerId,
        sessionId: sessionId ?? undefined,
        failureClass: classification.failureClass,
        retryable: classification.retryable,
      }
    );

    if (classification.shouldDegradeProvider) {
      this.deps.providerRegistry.handleRuntimeFailure(providerId, error);
    }
    if (sessionId) {
      this.applyClassifiedSessionCleanup(sessionId, binding, classification);
    }

    this.deps.broadcaster({
      type: "session:error",
      payload: {
        sessionId: sessionId ?? null,
        providerId,
        message:
          error instanceof Error ? error.message : "Provider unavailable",
        failureClass: classification.failureClass,
        retryable: classification.retryable,
      },
    });
    if (sessionId) {
      this.maybeBroadcastSwitchOffer({
        sessionId,
        providerId,
        binding,
        adapterAvailable: Boolean(adapter),
        classification,
      });
    } else {
      this.deps.stateBroadcaster();
    }
  }

  private applyClassifiedSessionCleanup(
    sessionId: string,
    binding: ProviderSessionBindingLike | undefined,
    classification: ProviderFailureClassification
  ): void {
    if (classification.shouldRemoveBinding && binding) {
      binding.unsubscribe();
      this.deps.providerSessions.delete(sessionId);
      this.deps.sessionManager.markProviderSessionFailed(sessionId);
      this.deps.sessionStorage.close(sessionId, "provider-failure");
      this.deps.broadcastSessionBinding(sessionId);
    } else {
      this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
    }

    if (classification.retryable) {
      this.deps.consumeRetryBudget(sessionId, classification.failureClass);
      return;
    }
    this.deps.expirePendingUserIntent(sessionId);
  }

  private maybeBroadcastSwitchOffer(options: {
    readonly sessionId: string;
    readonly providerId: string;
    readonly binding: ProviderSessionBindingLike | undefined;
    readonly adapterAvailable: boolean;
    readonly classification: ProviderFailureClassification;
  }): void {
    const session = this.deps.sessionManager.getSession(options.sessionId);
    const offerPayload = buildSwitchOfferPayload(
      options.classification,
      {
        sessionId: options.sessionId,
        dialogId: options.sessionId,
        providerId: options.providerId,
        providerSessionId: options.binding?.providerSessionId ?? null,
        stage: session?.stage ?? null,
        adapterAvailable: options.adapterAvailable,
      },
      (providerKey: string) =>
        Boolean(this.deps.providerRegistry.getAdapter(providerKey))
    );

    if (!offerPayload) {
      return;
    }
    this.deps.broadcaster({
      type: "dialog:switch:offer",
      payload: offerPayload,
    });
  }
}

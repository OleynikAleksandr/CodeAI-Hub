import type { ProviderRegistry } from "../../provider-registry";
import { resolveProviderModelSyncCapabilities } from "../../provider-registry/provider-descriptor-factory";
import type { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import {
  type BridgeEvent,
  readAppliedProviderTurnConfig,
  shouldBroadcastAppliedProviderModelUpdate,
} from "../types";
import type { ProviderSessionBinding } from "./session-request-handler";
import type { SessionRequestHandlerAppliedTurnConfig } from "./session-request-handler-applied-turn-config";
import { stripInternalWorkflowTurnOptions } from "./workflow-turn-control";

interface SessionRequestHandlerMessageDispatchDependencies {
  readonly appliedTurnConfig: SessionRequestHandlerAppliedTurnConfig;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly continuity: SessionContinuityFacade;
  readonly emitTurnStateEvent: (options: {
    readonly sessionId: string;
    readonly state: "idle" | "running";
  }) => void;
  readonly handleProviderFailure: (
    providerId: string,
    error: unknown,
    sessionId?: string
  ) => void;
  readonly logger: Logger;
  readonly providerRegistry: ProviderRegistry;
  readonly providerSessions: Map<string, ProviderSessionBinding>;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly trackPendingUserIntent: (sessionId: string, content: string) => void;
}

export class SessionRequestHandlerMessageDispatch {
  private readonly deps: SessionRequestHandlerMessageDispatchDependencies;

  constructor(deps: SessionRequestHandlerMessageDispatchDependencies) {
    this.deps = deps;
  }

  async sendInternalMessage(sessionId: string, content: string): Promise<void> {
    const resolved = this.resolveBoundProviderChannel(sessionId);
    if (!resolved) {
      this.deps.broadcaster({
        type: "session:error",
        payload: {
          sessionId,
          message: "Provider binding is unavailable for internal message.",
          code: "missing_provider_binding",
          retryable: false,
        },
      });
      return;
    }

    this.deps.emitTurnStateEvent({ sessionId, state: "running" });
    try {
      await this.deps.continuity.ensureTrackedOnOutboundMessage({
        sessionId,
        providerSessionId: resolved.binding.providerSessionId,
      });
    } catch (error) {
      this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
      this.deps.logger.warn("Continuity tracking failed for internal message", {
        sessionId,
        providerId: resolved.binding.providerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    this.deps.logger.info("Dispatching message to provider adapter", {
      sessionId,
      providerId: resolved.binding.providerId,
      providerSessionId: resolved.binding.providerSessionId,
      contentLength: content.length,
    });
    try {
      const providerTurnOptions = this.attachProviderTurnOptions(
        sessionId,
        resolved.binding.providerId
      );
      await resolved.adapter.sendMessage(
        resolved.binding.providerSessionId,
        content,
        providerTurnOptions
      );
    } catch (error) {
      this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
      this.deps.logger.warn("Provider sendMessage failed", {
        sessionId,
        providerId: resolved.binding.providerId,
        providerSessionId: resolved.binding.providerSessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.deps.handleProviderFailure(
        resolved.binding.providerId,
        error,
        sessionId
      );
    }
  }

  async dispatchUserMessage(options: {
    readonly content: string;
    readonly hiddenUserMessage: boolean;
    readonly session: Session;
    readonly sessionId: string;
    readonly turnOptions?: Record<string, unknown>;
  }): Promise<void> {
    if (
      !(
        options.hiddenUserMessage ||
        (await this.appendVisibleUserMessage(
          options.session,
          options.sessionId,
          options.content
        ))
      )
    ) {
      return;
    }

    const resolved = this.resolveBoundProviderChannel(options.sessionId);
    if (!resolved) {
      this.deps.trackPendingUserIntent(options.sessionId, options.content);
      this.deps.broadcaster({
        type: "session:error",
        payload: {
          sessionId: options.sessionId,
          message:
            "Provider binding is unavailable. Your message has been saved and will be retried when the provider recovers.",
          code: "missing_provider_binding",
          retryable: true,
        },
      });
      return;
    }

    this.deps.emitTurnStateEvent({
      sessionId: options.sessionId,
      state: "running",
    });
    try {
      await this.deps.continuity.ensureTrackedOnOutboundMessage({
        sessionId: options.sessionId,
        providerSessionId: resolved.binding.providerSessionId,
      });
      this.deps.logger.info("Dispatching message to provider adapter", {
        sessionId: options.sessionId,
        providerId: resolved.binding.providerId,
        providerSessionId: resolved.binding.providerSessionId,
        contentLength: options.content.length,
      });
      const providerTurnOptions = this.attachProviderTurnOptions(
        options.sessionId,
        resolved.binding.providerId,
        stripInternalWorkflowTurnOptions(options.turnOptions)
      );
      await resolved.adapter.sendMessage(
        resolved.binding.providerSessionId,
        options.content,
        providerTurnOptions
      );
    } catch (error) {
      this.deps.emitTurnStateEvent({
        sessionId: options.sessionId,
        state: "idle",
      });
      this.deps.logger.warn("Provider sendMessage failed", {
        sessionId: options.sessionId,
        providerId: resolved.binding.providerId,
        providerSessionId: resolved.binding.providerSessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.deps.handleProviderFailure(
        resolved.binding.providerId,
        error,
        options.sessionId
      );
    }
  }

  private async appendVisibleUserMessage(
    session: Session,
    sessionId: string,
    content: string
  ): Promise<boolean> {
    const userMessage = this.deps.sessionManager.appendMessage(
      sessionId,
      "user",
      content
    );
    if (!userMessage) {
      this.deps.broadcaster({
        type: "session:error",
        payload: { sessionId, message: "Session not found" },
      });
      return false;
    }

    try {
      await this.deps.sessionStorage.appendMessage(sessionId, userMessage);
    } catch (error: unknown) {
      this.deps.logger.error(
        "Failed to append unified session record",
        error as Error,
        {
          sessionId,
          providerId: session.providerId,
        }
      );
      this.deps.broadcaster({
        type: "session:error",
        payload: {
          sessionId,
          message: "Failed to persist message to history",
        },
      });
      return false;
    }

    this.deps.broadcaster({ type: "session:message", payload: userMessage });
    return true;
  }

  private resolveBoundProviderChannel(sessionId: string): {
    readonly adapter: NonNullable<ReturnType<ProviderRegistry["getAdapter"]>>;
    readonly binding: ProviderSessionBinding;
  } | null {
    const binding = this.deps.providerSessions.get(sessionId);
    const adapter = binding
      ? this.deps.providerRegistry.getAdapter(binding.providerId)
      : null;
    if (!(binding && adapter)) {
      this.logMissingProviderBindingForIncomingMessage(
        sessionId,
        binding?.providerId,
        Boolean(binding),
        Boolean(adapter)
      );
      return null;
    }
    return { binding, adapter };
  }

  private attachProviderTurnOptions(
    sessionId: string,
    providerId: string,
    turnOptions?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    const providerTurnOptions = this.deps.appliedTurnConfig.attachToTurnOptions(
      {
        providerId,
        turnOptions,
      }
    );
    const modelUpdateEligibility = {
      turnConfig: readAppliedProviderTurnConfig(providerTurnOptions),
      syncsLabelFromAppliedConfig:
        resolveProviderModelSyncCapabilities(providerId)
          .syncsLabelFromAppliedConfig,
    };
    if (!shouldBroadcastAppliedProviderModelUpdate(modelUpdateEligibility)) {
      return providerTurnOptions;
    }
    const { turnConfig } = modelUpdateEligibility;
    this.deps.broadcaster({
      type: "session:model:update",
      payload: {
        sessionId,
        providerId: turnConfig.providerId,
        modelId: turnConfig.modelId,
      },
    });
    return providerTurnOptions;
  }

  private logMissingProviderBindingForIncomingMessage(
    sessionId: string,
    providerId: string | undefined,
    hasBinding: boolean,
    hasAdapter: boolean
  ): void {
    this.deps.logger.warn("Provider binding or adapter missing for session", {
      sessionId,
      providerId: providerId ?? null,
      hasBinding,
      hasAdapter,
    });
    this.deps.logger.warn("Known provider session bindings", {
      sessionId,
      knownSessionIds: Array.from(this.deps.providerSessions.keys()),
    });
  }
}

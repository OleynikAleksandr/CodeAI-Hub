import type { ProviderRegistry } from "../../provider-registry";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { SessionContinuityLockService } from "./session-continuity-lock-service";
import type { SessionProviderBindingService } from "./session-provider-binding-service";
import type { SessionRequestHandlerResumeLifecycle } from "./session-request-handler-resume-lifecycle";
import type { ProviderSessionBindingLike } from "./session-request-handler-runtime-types";

interface SessionRequestHandlerStopActionOptions {
  readonly continuityLockService: SessionContinuityLockService;
  readonly emitSessionError: (sessionId: string, message: string) => void;
  readonly emitTurnStateEvent: (options: {
    readonly sessionId: string;
    readonly state: "idle" | "running";
  }) => void;
  readonly logger: Logger;
  readonly providerBindingService: SessionProviderBindingService;
  readonly providerRegistry: ProviderRegistry;
  readonly providerSessions: Map<string, ProviderSessionBindingLike>;
  readonly resumeLifecycle: SessionRequestHandlerResumeLifecycle;
  readonly sessionManager: SessionManager;
}

export class SessionRequestHandlerStopAction {
  private readonly deps: SessionRequestHandlerStopActionOptions;

  constructor(options: SessionRequestHandlerStopActionOptions) {
    this.deps = options;
  }

  async handleStop(sessionId: string): Promise<void> {
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      this.deps.emitSessionError(sessionId, "Session not found");
      return;
    }

    const binding = this.deps.providerSessions.get(sessionId);
    if (binding) {
      const adapter = this.deps.providerRegistry.getAdapter(binding.providerId);
      try {
        await adapter?.closeSession(binding.providerSessionId);
      } catch (error: unknown) {
        this.deps.logger.warn("Session stop failed to close provider session", {
          sessionId,
          providerId: binding.providerId,
          providerSessionId: binding.providerSessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const lifecycleState =
      this.deps.resumeLifecycle.getSessionResumeLifecycleState(session);
    if (lifecycleState.mode !== "no_resume") {
      this.deps.resumeLifecycle.updateSessionResumeLifecycleState(session, {
        finalTurnCompleted: false,
        terminalLockReason: null,
      });
    }
    this.deps.resumeLifecycle.clearPostTurnContextDecision(sessionId);

    if (this.deps.continuityLockService.getContext(sessionId)) {
      this.deps.continuityLockService.finalizeFlowNodeContinuityLock({
        sessionId,
        reason: "resume_failed",
      });
    } else if (lifecycleState.mode !== "no_resume") {
      this.deps.continuityLockService.emitResumeInPlaceNoRolloverUnlock(
        session
      );
    }

    this.deps.providerBindingService.invalidateProviderBinding(sessionId);
    this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
    this.deps.logger.info(
      "Session stop invalidated provider binding without shutting down core",
      {
        sessionId,
        providerId: session.providerId,
        stage: session.stage ?? null,
      }
    );
  }
}

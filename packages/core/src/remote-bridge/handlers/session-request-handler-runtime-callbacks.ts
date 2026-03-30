import crypto from "node:crypto";
import type { FlowNodeContinuityFacade } from "../../flow-node-continuity/flow-node-continuity-facade";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type { BridgeEvent } from "../types";
import type { SessionContinuityLockService } from "./session-continuity-lock-service";
import type { SessionContinuityRolloverOrchestrator } from "./session-continuity-rollover-orchestrator";
import type { SessionProviderFailureRecovery } from "./session-provider-failure-recovery";
import type { MessageContentPayload } from "./session-request-handler-event-messages";
import type {
  ContinuityRootResolutionOptionsLike,
  SessionRequestHandlerRuntimeCallbacks,
} from "./session-request-handler-runtime-types";
import type { SessionRequestHandlerTurnArbitration } from "./session-request-handler-turn-arbitration";

interface SessionRequestHandlerRuntimeCallbackDependencies {
  readonly getBroadcaster: () => (event: BridgeEvent) => void;
  readonly getContinuityLockService: () => SessionContinuityLockService;
  readonly getContinuityRolloverOrchestrator: () => SessionContinuityRolloverOrchestrator;
  readonly getFlowNodeContinuity: () => FlowNodeContinuityFacade;
  readonly getLogger: () => Logger;
  readonly getProviderFailureRecovery: () => SessionProviderFailureRecovery;
  readonly getProviderRegistry: () => ProviderRegistry;
  readonly getSessionManager: () => SessionManager;
  readonly getTurnArbitration: () => SessionRequestHandlerTurnArbitration;
  readonly getWorkspaceRuntime: () => WorkspaceRuntimeFacade | undefined;
  readonly handleMessage: (
    sessionId: string,
    payload: MessageContentPayload
  ) => Promise<void>;
  readonly handleProviderEvent: (sessionId: string, event: unknown) => void;
  readonly resolveContinuityRootSessionId: (
    options: ContinuityRootResolutionOptionsLike
  ) => Promise<string>;
}

export const createSessionRequestHandlerRuntimeCallbacks = (
  dependencies: SessionRequestHandlerRuntimeCallbackDependencies
): SessionRequestHandlerRuntimeCallbacks => {
  const isFlowNodeRolloverPending = (sessionId: string): boolean =>
    dependencies.getContinuityRolloverOrchestrator().hasPending(sessionId) ||
    dependencies.getContinuityLockService().hasContext(sessionId);

  const emitTurnStateEvent = (turnStateOptions: {
    readonly sessionId: string;
    readonly state: "running" | "idle";
  }): void => {
    const session = dependencies
      .getSessionManager()
      .getSession(turnStateOptions.sessionId);
    const providerId = session?.providerId ?? null;
    if (session) {
      dependencies.getWorkspaceRuntime()?.notifyTurnStateChanged(
        {
          workspaceRoot: session.workspacePath,
          nodeId: session.stage ?? "session",
          sessionId: session.id,
        },
        turnStateOptions.state
      );
    }
    dependencies.getBroadcaster()({
      type: "session:stream",
      payload: {
        sessionId: turnStateOptions.sessionId,
        event: {
          type: "stream_event",
          provider: providerId ?? "core",
          sessionId: turnStateOptions.sessionId,
          data: {
            kind: "turn_state",
            state: turnStateOptions.state,
            ...(providerId ? { providerId } : {}),
          },
          uuid: `${crypto.randomUUID()}::turn_state`,
          timestamp: new Date().toISOString(),
        },
      },
    });
  };

  const getDefaultProviderId = (): string => {
    const providers = dependencies.getProviderRegistry().listProviders();
    const activeProvider = providers.find(
      (provider) =>
        provider.status === "active" &&
        Boolean(dependencies.getProviderRegistry().getAdapter(provider.id))
    );
    if (activeProvider) {
      return activeProvider.id;
    }
    const fallbackProvider = providers.find((provider) =>
      Boolean(dependencies.getProviderRegistry().getAdapter(provider.id))
    );
    return fallbackProvider?.id ?? "claudeCodeCli";
  };

  const handleProviderFailure = (
    providerId: string,
    error: unknown,
    sessionId?: string
  ): void => {
    dependencies
      .getProviderFailureRecovery()
      .handleProviderFailure(providerId, error, sessionId);
  };

  const runTurnCompletedArbitration = (sessionId: string): void => {
    dependencies.getTurnArbitration().runTurnCompletedArbitration(sessionId);
  };

  const resolveImmediatePostTurnContextDecision = (
    session: Session
  ): "rollover_required" | "no_rollover" | null => {
    if (isFlowNodeRolloverPending(session.id)) {
      return "rollover_required";
    }
    if (!(session.initiativeSlug && session.stage)) {
      return "no_rollover";
    }
    if (
      !dependencies.getFlowNodeContinuity().isEligibleForRollover({
        stageId: session.stage,
        runSlug: session.runSlug,
      })
    ) {
      return "no_rollover";
    }
    return null;
  };

  const handleTurnCompletedWithFlowNodeArbitration = (
    sessionId: string,
    flowNodeContinuityTask: Promise<void>
  ): void => {
    flowNodeContinuityTask
      .catch((error: unknown) => {
        dependencies.getLogger().warn("Flow node continuity handler failed", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        runTurnCompletedArbitration(sessionId);
      });
  };

  const handleFlowNodeContinuityProviderEvent = async (
    sessionId: string,
    event: unknown
  ): Promise<void> => {
    await dependencies
      .getTurnArbitration()
      .handleFlowNodeContinuityProviderEvent({
        sessionId,
        event,
        resolveLiveContinuityRemainingPercentThreshold: async (session) =>
          await dependencies
            .getTurnArbitration()
            .resolveLiveContinuityRemainingPercentThreshold(session),
      });
  };

  return {
    emitContinuityLockEvent: (lockEvent) =>
      dependencies
        .getContinuityLockService()
        .emitContinuityLockEvent(lockEvent),
    emitTurnStateEvent,
    finalizeFlowNodeContinuityLock: (lockOptions) =>
      dependencies
        .getContinuityLockService()
        .finalizeFlowNodeContinuityLock(lockOptions),
    finalizeFlowNodeContinuityLockOnBootstrapGate: (lockOptions) =>
      dependencies
        .getContinuityLockService()
        .finalizeFlowNodeContinuityLockOnBootstrapGate(lockOptions),
    getDefaultProviderId,
    handleFlowNodeContinuityProviderEvent,
    handleMessage: dependencies.handleMessage,
    handleProviderEvent: dependencies.handleProviderEvent,
    handleProviderFailure,
    handleTurnCompletedWithFlowNodeArbitration,
    isFlowNodeRolloverPending,
    registerFlowNodeContinuityLockContext: (context) =>
      dependencies
        .getContinuityLockService()
        .registerFlowNodeContinuityLockContext(context),
    resolveContinuityRootSessionId: dependencies.resolveContinuityRootSessionId,
    resolveImmediatePostTurnContextDecision,
    runTurnCompletedArbitration,
  };
};

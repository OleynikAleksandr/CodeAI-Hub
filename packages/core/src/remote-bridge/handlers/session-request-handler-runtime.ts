import { SessionContinuityRolloverOrchestrator } from "./session-continuity-rollover-orchestrator";
import { SessionRequestHandlerFlowNodeReportState } from "./session-request-handler-flow-node-report-state";
import { SessionRequestHandlerFlowNodeRollover } from "./session-request-handler-flow-node-rollover";
import { createSessionRequestHandlerRuntimeCore } from "./session-request-handler-runtime-core";
import type { SessionRequestHandlerRuntimeDependencies } from "./session-request-handler-runtime-types";
import { SessionRequestHandlerTurnArbitration } from "./session-request-handler-turn-arbitration";
import { SessionRequestHandlerTurnCompletion } from "./session-request-handler-turn-completion";
import { SessionRequestHandlerTurnThresholdResolver } from "./session-request-handler-turn-threshold-resolver";

export const createSessionRequestHandlerRuntime = (
  options: SessionRequestHandlerRuntimeDependencies
) => {
  let continuityRolloverOrchestrator!: SessionContinuityRolloverOrchestrator;
  const core = createSessionRequestHandlerRuntimeCore(options, {
    clearPendingState: (sessionId) =>
      continuityRolloverOrchestrator.clearPendingState(sessionId),
    clearTokenUsageSnapshot: (sessionId) =>
      continuityRolloverOrchestrator.clearTokenUsageSnapshot(sessionId),
  });
  const flowNodeReportState = new SessionRequestHandlerFlowNodeReportState({
    broadcaster: options.broadcaster,
  });
  const flowNodeRollover = new SessionRequestHandlerFlowNodeRollover({
    continuityRootBySessionId: options.continuityRootBySessionId,
    providerRegistry: options.providerRegistry,
    flowNodeContinuity: core.flowNodeContinuity,
    sessionBootstrap: core.sessionBootstrap,
    messageDispatch: core.messageDispatch,
    reportState: flowNodeReportState,
    emitTurnStateEvent: options.callbacks.emitTurnStateEvent,
    registerFlowNodeContinuityLockContext:
      options.callbacks.registerFlowNodeContinuityLockContext,
    emitContinuityLockEvent: options.callbacks.emitContinuityLockEvent,
    finalizeFlowNodeContinuityLock:
      options.callbacks.finalizeFlowNodeContinuityLock,
  });
  continuityRolloverOrchestrator = new SessionContinuityRolloverOrchestrator({
    logger: options.logger,
    registerPostTurnRolloverRequiredDecision: (sessionId) =>
      core.resumeLifecycle.registerPostTurnRolloverRequiredDecision(sessionId),
    elevateSessionToRolloverResumeMode: (session) =>
      core.resumeLifecycle.elevateSessionToRolloverResumeMode(session),
    registerFlowNodeContinuityLockContext:
      options.callbacks.registerFlowNodeContinuityLockContext,
    emitContinuityLockEvent: options.callbacks.emitContinuityLockEvent,
    emitFlowNodeRolloverNotification: (sessionId, notification) =>
      flowNodeReportState.emitFlowNodeRolloverNotification(
        sessionId,
        notification
      ),
    rolloverFlowNodeSession: (session, rollover, rolloverOptions) =>
      flowNodeRollover.rolloverFlowNodeSession(
        session,
        rollover,
        rolloverOptions
      ),
    getCreateReportRequest: (sessionId) =>
      flowNodeReportState.getCreateReportRequest(sessionId),
    deleteCreateReportRequest: (sessionId) =>
      flowNodeReportState.deleteCreateReportRequest(sessionId),
    finalizeFlowNodeContinuityLock:
      options.callbacks.finalizeFlowNodeContinuityLock,
    updateSessionResumeLifecycleState: (session, patch) =>
      core.resumeLifecycle.updateSessionResumeLifecycleState(session, patch),
    emitTurnStateEvent: options.callbacks.emitTurnStateEvent,
    emitContinuityFailedEvent: (failureOptions) =>
      flowNodeReportState.emitContinuityFailedEvent(failureOptions),
    isContinuityReportTimeoutError: (error) =>
      flowNodeReportState.isContinuityReportTimeoutError(error),
  });
  const turnCompletion = new SessionRequestHandlerTurnCompletion({
    continuityLockService: core.continuityLockService,
    emitTurnStateEvent: options.callbacks.emitTurnStateEvent,
    finalizeFlowNodeContinuityLockOnBootstrapGate:
      options.callbacks.finalizeFlowNodeContinuityLockOnBootstrapGate,
    isFlowNodeRolloverPending: options.callbacks.isFlowNodeRolloverPending,
    logger: options.logger,
    resolveImmediatePostTurnContextDecision:
      options.callbacks.resolveImmediatePostTurnContextDecision,
    resumeLifecycle: core.resumeLifecycle,
    sessionManager: options.sessionManager,
  });
  const turnArbitration = new SessionRequestHandlerTurnArbitration({
    continuityRolloverOrchestrator,
    flowNodeContinuity: core.flowNodeContinuity,
    resumeLifecycle: core.resumeLifecycle,
    sessionManager: options.sessionManager,
    turnCompletion,
    turnThresholdResolver: new SessionRequestHandlerTurnThresholdResolver(
      options.config
    ),
  });
  return {
    ...core,
    continuityRolloverOrchestrator,
    flowNodeReportState,
    flowNodeRollover,
    turnArbitration,
  };
};

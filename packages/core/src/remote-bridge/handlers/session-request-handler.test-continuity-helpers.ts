import {
  type HandlerHarness,
  internals,
  noop,
} from "./session-request-handler.test-helpers";

export const createDescriptionSession = (
  harness: HandlerHarness,
  workspacePath: string,
  providerSessionId?: string,
  providerId = "claudeCodeCli"
) =>
  harness.sessionManager.createSession(
    providerId,
    workspacePath,
    providerSessionId,
    {
      initiativeSlug: "demo",
      stage: "description",
      runSlug: "reviewer",
    }
  );

export const stubDescriptionDialogSync = (harness: HandlerHarness): void => {
  Object.assign(internals(harness.handler).descriptionDialogSync, {
    resolveDescriptionDialog: async () => null,
    maybePromoteLegacyDescriptionDialogHistory: noop,
    maybeBackfillDescriptionDialogHistory: async () => Promise.resolve(),
    updateDescriptionSessionRef: async () => Promise.resolve(),
  });
};

export const setLifecycle = (
  harness: HandlerHarness,
  sessionId: string,
  mode: "resume_in_place" | "resume_via_rollover" | "no_resume"
): void => {
  internals(harness.handler).resumeLifecycle.sessionResumeLifecycleStates.set(
    sessionId,
    { mode, finalTurnCompleted: false, terminalLockReason: null }
  );
};

export const emitProviderEvent = (
  harness: HandlerHarness,
  sessionId: string,
  event: Record<string, unknown>
): void => {
  internals(harness.handler).providerEventRouter.handleProviderEvent(
    sessionId,
    event
  );
};

export const useProductionFlowNodeHandler = (harness: HandlerHarness): void => {
  const ta = internals(harness.handler).turnArbitration;
  internals(harness.handler).handleFlowNodeContinuityProviderEvent = async (
    sid: string,
    evt: unknown
  ) => {
    await ta.handleFlowNodeContinuityProviderEvent({
      sessionId: sid,
      event: evt,
      resolveLiveContinuityRemainingPercentThreshold: async (s: unknown) =>
        await ta.resolveLiveContinuityRemainingPercentThreshold(s),
    });
  };
};

export const registerBootstrapLock = (
  harness: HandlerHarness,
  sourceSessionId: string,
  targetSessionId: string,
  rolloverId: string
): void => {
  const lockService = internals(harness.handler).continuityLockService;
  lockService.registerFlowNodeContinuityLockContext({
    rolloverId,
    sourceSessionId,
    targetSessionId,
    stageId: "description",
    runSlug: "reviewer",
    awaitingBootstrapTurn: true,
  });
  lockService.emitContinuityLockEvent({
    sessionId: targetSessionId,
    rolloverId,
    sourceSessionId,
    targetSessionId,
    stageId: "description",
    runSlug: "reviewer",
    state: "locked",
    reason: "resume_bootstrap",
  });
};

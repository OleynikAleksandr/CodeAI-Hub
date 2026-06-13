import { stat } from "node:fs/promises";
import path from "node:path";
import {
  buildManagedPersistentReturnHandoffMessage,
  buildManagedUserLedReviewHandoffMessage,
} from "../../managed-workflow-orchestration/managed-workflow-user-handoff-messages";
import {
  buildQualityGatesBoundaryBlockedMessage,
  buildQualityGatesContractDraftPrompt,
  buildQualityGatesIntegrationPrompt,
  buildQualityGatesResearchReviewRevisionPrompt,
  buildQualityGatesReviewRevisionPrompt,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder";
import {
  buildQualityGatesRepairLimitRevisionPrompt,
  type QualityGatesRepairPhase,
  readQualityGatesRepairLimitTask,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-repair-limit-acceptance";
import type { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { Session } from "../../session-manager";
import {
  buildContinuationDeliveryFailureMessage,
  dispatchManagedInternalContinuation,
  type ManagedInternalContinuationDispatch,
} from "./managed-internal-continuation-dispatch";
import { isRepairAttemptLimitReached } from "./managed-repair-limit";
import { completeQualityGatesPersistentReturn } from "./quality-gates-persistent-return";
import { buildQualityGatesVerificationContinuation } from "./quality-gates-repair-prompt-dispatch";
import type { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";

export interface QualityGatesReviewFlowDeps {
  readonly eventMessages: Pick<
    SessionRequestHandlerEventMessages,
    "appendCoreMessage"
  >;
  readonly messageDispatch: ManagedInternalContinuationDispatch;
  readonly stagePlan: QualityGatesStagePlanController;
}

const qualityGatesContractPath = (session: Session): string | null =>
  session.workspacePath && session.initiativeSlug
    ? path.join(
        session.workspacePath,
        ".codeai-hub",
        session.initiativeSlug,
        "quality_gates",
        "quality-gates.json"
      )
    : null;

const hasQualityGatesContract = async (session: Session): Promise<boolean> => {
  const contractPath = qualityGatesContractPath(session);
  return contractPath
    ? ((await stat(contractPath).catch(() => null))?.isFile() ?? false)
    : false;
};

const dispatchWithDeliveryGuard = (
  session: Session,
  content: string,
  deps: QualityGatesReviewFlowDeps
): void => {
  dispatchManagedInternalContinuation(deps.messageDispatch, {
    content,
    onDeliveryFailure: (error) => {
      deps.eventMessages.appendCoreMessage(session.id, {
        content: buildContinuationDeliveryFailureMessage(error),
        tag: "managed-workflow-validation",
      });
    },
    session,
    sessionId: session.id,
  });
};

export const openQualityGatesNextAcceptedReviewPhase = async (
  session: Session,
  deps: QualityGatesReviewFlowDeps
): Promise<void> => {
  if (!(session.workspacePath && session.initiativeSlug)) {
    return;
  }
  if (!(await hasQualityGatesContract(session))) {
    const prompt = buildQualityGatesContractDraftPrompt({
      workspaceSlug: session.initiativeSlug,
    });
    dispatchWithDeliveryGuard(session, prompt, deps);
    return;
  }
  try {
    await deps.stagePlan.acceptUserReviewWithoutRevision({
      workspaceRoot: session.workspacePath,
    });
  } catch (error) {
    deps.eventMessages.appendCoreMessage(session.id, {
      content: buildQualityGatesBoundaryBlockedMessage(
        error instanceof Error ? error.message : String(error)
      ),
      tag: "managed-workflow-validation",
    });
    return;
  }
  const prompt = buildQualityGatesIntegrationPrompt({
    workspaceSlug: session.initiativeSlug,
  });
  dispatchWithDeliveryGuard(session, prompt, deps);
};

export const dispatchQualityGatesReviewRevision = async (
  session: Session,
  content: string,
  deps: QualityGatesReviewFlowDeps
): Promise<void> => {
  if (!session.initiativeSlug) {
    return;
  }
  const builder = (await hasQualityGatesContract(session))
    ? buildQualityGatesReviewRevisionPrompt
    : buildQualityGatesResearchReviewRevisionPrompt;
  const prompt = builder({
    userFeedback: content,
    workspaceSlug: session.initiativeSlug,
  });
  dispatchWithDeliveryGuard(session, prompt, deps);
};

export interface QualityGatesRepairLimitReviewDeps {
  readonly eventMessages: Pick<
    SessionRequestHandlerEventMessages,
    "appendCoreMessage" | "appendDialogMessage" | "waitForMessagePersistence"
  >;
  readonly messageDispatch: ManagedInternalContinuationDispatch;
  readonly stagePlan: QualityGatesStagePlanController;
}

const continueAfterRepairLimitAccept = async (
  session: Session,
  phase: QualityGatesRepairPhase,
  deps: QualityGatesRepairLimitReviewDeps
): Promise<void> => {
  if (!(session.workspacePath && session.initiativeSlug)) {
    return;
  }
  if (phase === "draft") {
    deps.eventMessages.appendCoreMessage(session.id, {
      content: buildManagedUserLedReviewHandoffMessage("Quality Gates"),
      tag: "managed-workflow-user-review",
    });
    return;
  }
  if (phase === "integration") {
    deps.eventMessages.appendCoreMessage(session.id, {
      content: [
        "Quality Gates integration is accepted as is; the remaining diagnostics are recorded as warnings.",
        "Core opens Phase 4 Formal Quality Gates Verification.",
      ].join("\n"),
      tag: "managed-workflow-validation",
    });
    dispatchWithDeliveryGuard(
      session,
      buildQualityGatesVerificationContinuation(session.initiativeSlug),
      deps
    );
    return;
  }
  deps.eventMessages.appendCoreMessage(session.id, {
    content: buildManagedPersistentReturnHandoffMessage("Quality Gates"),
    tag: "managed-workflow-complete",
  });
  await completeQualityGatesPersistentReturn({
    sessionId: session.id,
    stagePlan: deps.stagePlan,
    waitForMessagePersistence: (sessionId) =>
      deps.eventMessages.waitForMessagePersistence(sessionId),
    workspaceRoot: session.workspacePath,
    workspaceSlug: session.initiativeSlug,
  });
};

export const handleQualityGatesRepairLimitReviewDecision = async (params: {
  readonly content: string;
  readonly deps: QualityGatesRepairLimitReviewDeps;
  readonly hiddenUserMessage: boolean;
  readonly intent: "accept" | "none" | "revision";
  readonly session: Session;
}): Promise<boolean> => {
  const { deps, session } = params;
  if (!(session.workspacePath && session.initiativeSlug)) {
    return false;
  }
  const repairTask = await readQualityGatesRepairLimitTask(
    session.workspacePath
  );
  if (!(repairTask && isRepairAttemptLimitReached(repairTask.attemptNumber))) {
    return false;
  }
  if (params.intent === "none") {
    return false;
  }
  if (!params.hiddenUserMessage) {
    deps.eventMessages.appendDialogMessage(session.id, {
      content: params.content,
      role: "user",
    });
  }
  if (params.intent === "revision") {
    deps.eventMessages.appendCoreMessage(session.id, {
      content:
        "Core dispatched the user corrections to the agent as a repair continuation.",
      tag: "managed-workflow-validation",
    });
    dispatchWithDeliveryGuard(
      session,
      buildQualityGatesRepairLimitRevisionPrompt({
        userFeedback: params.content,
        workspaceSlug: session.initiativeSlug,
      }),
      deps
    );
    return true;
  }
  try {
    const accepted = await deps.stagePlan.acceptRepairLimitAsIs({
      workspaceRoot: session.workspacePath,
    });
    await continueAfterRepairLimitAccept(session, accepted.phase, deps);
  } catch (error) {
    deps.eventMessages.appendCoreMessage(session.id, {
      content: buildQualityGatesBoundaryBlockedMessage(
        error instanceof Error ? error.message : String(error)
      ),
      tag: "managed-workflow-validation",
    });
  }
  return true;
};

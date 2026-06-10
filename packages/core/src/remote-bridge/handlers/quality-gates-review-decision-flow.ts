import { stat } from "node:fs/promises";
import path from "node:path";
import {
  buildQualityGatesBoundaryBlockedMessage,
  buildQualityGatesContractDraftPrompt,
  buildQualityGatesIntegrationPrompt,
  buildQualityGatesResearchReviewRevisionPrompt,
  buildQualityGatesReviewRevisionPrompt,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder";
import type { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { Session } from "../../session-manager";
import {
  buildContinuationDeliveryFailureMessage,
  dispatchManagedInternalContinuation,
  type ManagedInternalContinuationDispatch,
} from "./managed-internal-continuation-dispatch";
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

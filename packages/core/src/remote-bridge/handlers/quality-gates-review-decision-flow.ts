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
import type { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";
import type { SessionRequestHandlerMessageDispatch } from "./session-request-handler-message-dispatch";

export interface QualityGatesReviewFlowDeps {
  readonly eventMessages: Pick<
    SessionRequestHandlerEventMessages,
    "appendCoreMessage"
  >;
  readonly messageDispatch: Pick<
    SessionRequestHandlerMessageDispatch,
    "sendInternalMessage"
  >;
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
    deps.eventMessages.appendCoreMessage(session.id, {
      content: prompt,
      tag: "managed-workflow-continuation",
    });
    await deps.messageDispatch.sendInternalMessage(session.id, prompt);
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
  deps.eventMessages.appendCoreMessage(session.id, {
    content: prompt,
    tag: "managed-workflow-continuation",
  });
  await deps.messageDispatch.sendInternalMessage(session.id, prompt);
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
  deps.eventMessages.appendCoreMessage(session.id, {
    content: prompt,
    tag: "managed-workflow-user-review",
  });
  await deps.messageDispatch.sendInternalMessage(session.id, prompt);
};

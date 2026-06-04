import { buildApplicationSkeletonBoundaryBlockedMessage } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder";
import type { ApplicationSkeletonStagePlanController } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller";
import { buildManagedPersistentReturnHandoffMessage } from "../../managed-workflow-orchestration/managed-workflow-user-handoff-messages";
import type { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";

interface ApplicationSkeletonCompletionHandoffParams {
  readonly broadcaster?: (event: unknown) => void;
  readonly commitTerminalHandoffResidue?: (params: {
    readonly workspaceRoot: string;
  }) => Promise<void>;
  readonly eventMessages: Pick<
    SessionRequestHandlerEventMessages,
    "appendCoreMessage"
  > &
    Partial<
      Pick<SessionRequestHandlerEventMessages, "waitForMessagePersistence">
    >;
  readonly sessionId: string;
  readonly stagePlan: ApplicationSkeletonStagePlanController;
  readonly workspaceRoot: string;
}

const commitTerminalHandoffResidue = async (
  params: ApplicationSkeletonCompletionHandoffParams
): Promise<void> => {
  if (params.commitTerminalHandoffResidue) {
    await params.commitTerminalHandoffResidue({
      workspaceRoot: params.workspaceRoot,
    });
    return;
  }
  await params.stagePlan.commitTerminalHandoffResidue({
    workspaceRoot: params.workspaceRoot,
  });
};

export const completeApplicationSkeletonMaterializedHandoff = async (
  params: ApplicationSkeletonCompletionHandoffParams
): Promise<boolean> => {
  try {
    await params.stagePlan.acceptFinalMaterializedReview({
      workspaceRoot: params.workspaceRoot,
    });
  } catch (error) {
    params.eventMessages.appendCoreMessage(params.sessionId, {
      content: buildApplicationSkeletonBoundaryBlockedMessage(
        error instanceof Error ? error.message : String(error)
      ),
      tag: "managed-workflow-validation",
    });
    return false;
  }
  params.eventMessages.appendCoreMessage(params.sessionId, {
    content: buildManagedPersistentReturnHandoffMessage("Application Skeleton"),
    tag: "managed-workflow-complete",
  });
  await params.eventMessages.waitForMessagePersistence?.(params.sessionId);
  try {
    await commitTerminalHandoffResidue(params);
  } catch (error) {
    params.eventMessages.appendCoreMessage(params.sessionId, {
      content: buildApplicationSkeletonBoundaryBlockedMessage(
        error instanceof Error ? error.message : String(error)
      ),
      tag: "managed-workflow-validation",
    });
    return false;
  }
  params.broadcaster?.({
    payload: { stage: "quality_gates" },
    type: "workflow:stage:activate",
  });
  return true;
};

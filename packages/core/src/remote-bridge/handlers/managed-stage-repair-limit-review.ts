import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import {
  acceptApplicationSkeletonRepairLimitAsIs,
  buildApplicationSkeletonRepairLimitRevisionPrompt,
  readApplicationSkeletonRepairLimitTask,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-repair-limit-acceptance";
import {
  acceptDiagramModulesRepairLimitAsIs,
  buildDiagramModulesRepairLimitRevisionPrompt,
  readDiagramModulesRepairLimitAttempt,
} from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance";
import { buildManagedUserLedReviewHandoffMessage } from "../../managed-workflow-orchestration/managed-workflow-user-handoff-messages";
import type { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { Session } from "../../session-manager";
import {
  buildContinuationDeliveryFailureMessage,
  dispatchManagedInternalContinuation,
  type ManagedInternalContinuationDispatch,
} from "./managed-internal-continuation-dispatch";
import { isRepairAttemptLimitReached } from "./managed-repair-limit";
import { handleQualityGatesRepairLimitReviewDecision } from "./quality-gates-review-decision-flow";
import type { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";

export interface ManagedStageRepairLimitReviewDeps {
  readonly developmentTreeAgentGateway?: DevelopmentTreeAgentSessionGateway;
  readonly eventMessages: Pick<
    SessionRequestHandlerEventMessages,
    "appendCoreMessage" | "appendDialogMessage" | "waitForMessagePersistence"
  >;
  readonly messageDispatch: ManagedInternalContinuationDispatch;
  readonly qualityGatesStagePlan: QualityGatesStagePlanController;
}

interface ManagedStageRepairLimitReviewParams {
  readonly content: string;
  readonly deps: ManagedStageRepairLimitReviewDeps;
  readonly hiddenUserMessage: boolean;
  readonly intent: "accept" | "none" | "revision";
  readonly session: Session;
}

const appendUserReviewMessage = (
  params: ManagedStageRepairLimitReviewParams
): void => {
  if (params.hiddenUserMessage) {
    return;
  }
  params.deps.eventMessages.appendDialogMessage(params.session.id, {
    content: params.content,
    role: "user",
  });
};

const dispatchWithDeliveryGuard = (
  params: ManagedStageRepairLimitReviewParams,
  content: string
): void => {
  dispatchManagedInternalContinuation(params.deps.messageDispatch, {
    content,
    onDeliveryFailure: (error) => {
      params.deps.eventMessages.appendCoreMessage(params.session.id, {
        content: buildContinuationDeliveryFailureMessage(error),
        tag: "managed-workflow-validation",
      });
    },
    session: params.session,
    sessionId: params.session.id,
  });
};

const handleDiagramModulesRepairLimitReviewDecision = async (
  params: ManagedStageRepairLimitReviewParams
): Promise<boolean> => {
  const { deps, session } = params;
  if (!(session.workspacePath && session.initiativeSlug)) {
    return false;
  }
  const attemptNumber = await readDiagramModulesRepairLimitAttempt(
    session.workspacePath
  );
  if (!(attemptNumber && isRepairAttemptLimitReached(attemptNumber))) {
    return false;
  }
  if (params.intent === "none") {
    return false;
  }
  appendUserReviewMessage(params);
  if (params.intent === "revision") {
    deps.eventMessages.appendCoreMessage(session.id, {
      content:
        "Core dispatched the user corrections to the agent as a repair continuation.",
      tag: "managed-workflow-validation",
    });
    dispatchWithDeliveryGuard(
      params,
      buildDiagramModulesRepairLimitRevisionPrompt({
        userFeedback: params.content,
        workspaceSlug: session.initiativeSlug,
      })
    );
    return true;
  }
  try {
    await acceptDiagramModulesRepairLimitAsIs({
      workspaceRoot: session.workspacePath,
    });
    deps.eventMessages.appendCoreMessage(session.id, {
      content: buildManagedUserLedReviewHandoffMessage("Diagram Modules"),
      tag: "managed-workflow-user-review",
    });
  } catch (error) {
    deps.eventMessages.appendCoreMessage(session.id, {
      content: `Core could not accept the Diagram Modules artifact as is:\n${
        error instanceof Error ? error.message : String(error)
      }\nThe input is released. Send any message and Core will re-validate the workflow state.`,
      tag: "managed-workflow-validation",
    });
  }
  return true;
};

const handleApplicationSkeletonRepairLimitReviewDecision = async (
  params: ManagedStageRepairLimitReviewParams
): Promise<boolean> => {
  const { deps, session } = params;
  if (!(session.workspacePath && session.initiativeSlug)) {
    return false;
  }
  const repairTask = await readApplicationSkeletonRepairLimitTask(
    session.workspacePath
  );
  if (!(repairTask && isRepairAttemptLimitReached(repairTask.attemptNumber))) {
    return false;
  }
  if (params.intent === "none") {
    return false;
  }
  appendUserReviewMessage(params);
  if (params.intent === "revision") {
    deps.eventMessages.appendCoreMessage(session.id, {
      content:
        "Core dispatched the user corrections to the agent as a repair continuation.",
      tag: "managed-workflow-validation",
    });
    dispatchWithDeliveryGuard(
      params,
      buildApplicationSkeletonRepairLimitRevisionPrompt({
        userFeedback: params.content,
        workspaceSlug: session.initiativeSlug,
      })
    );
    return true;
  }
  try {
    const accepted = await acceptApplicationSkeletonRepairLimitAsIs({
      workspaceRoot: session.workspacePath,
    });
    deps.eventMessages.appendCoreMessage(session.id, {
      content:
        accepted.phase === "draft"
          ? buildManagedUserLedReviewHandoffMessage("Application Skeleton")
          : [
              "Application Skeleton materialization is accepted as is; the remaining diagnostics are recorded as warnings.",
              "Core opens the final user review. Accept it to unlock Quality Gates or describe further corrections.",
            ].join("\n"),
      tag: "managed-workflow-user-review",
    });
  } catch (error) {
    deps.eventMessages.appendCoreMessage(session.id, {
      content: `Core could not accept the Application Skeleton artifact as is:\n${
        error instanceof Error ? error.message : String(error)
      }\nThe input is released. Send any message and Core will re-validate the workflow state.`,
      tag: "managed-workflow-validation",
    });
  }
  return true;
};

export const handleManagedStageRepairLimitReviewDecision = (
  params: ManagedStageRepairLimitReviewParams
): Promise<boolean> => {
  const { session } = params;
  if (!(session.workspacePath && session.initiativeSlug)) {
    return Promise.resolve(false);
  }
  if (session.stage === "quality_gates") {
    return handleQualityGatesRepairLimitReviewDecision({
      content: params.content,
      deps: {
        eventMessages: params.deps.eventMessages,
        messageDispatch: params.deps.messageDispatch,
        stagePlan: params.deps.qualityGatesStagePlan,
      },
      hiddenUserMessage: params.hiddenUserMessage,
      intent: params.intent,
      session,
    });
  }
  if (session.stage === "diagram_modules") {
    return handleDiagramModulesRepairLimitReviewDecision(params);
  }
  if (session.stage === "application_skeleton") {
    return handleApplicationSkeletonRepairLimitReviewDecision(params);
  }
  return Promise.resolve(false);
};

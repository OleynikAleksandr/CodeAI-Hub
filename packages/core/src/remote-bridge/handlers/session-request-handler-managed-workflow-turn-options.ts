import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import type { ApplicationSkeletonStagePlanController } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller";
import type { DiagramModulesStagePlanController } from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller";
import type { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { SessionManager } from "../../session-manager";
import type { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";
import type { SessionRequestHandlerMessageDispatch } from "./session-request-handler-message-dispatch";

export interface ManagedWorkflowTurnEventMessages {
  readonly appendCoreMessage: SessionRequestHandlerEventMessages["appendCoreMessage"];
  readonly waitForMessagePersistence?: SessionRequestHandlerEventMessages["waitForMessagePersistence"];
}

export interface SessionRequestHandlerManagedWorkflowTurnOptions {
  readonly applicationStagePlan?: ApplicationSkeletonStagePlanController;
  readonly developmentTreeAgentGateway?: DevelopmentTreeAgentSessionGateway;
  readonly diagramStagePlan?: DiagramModulesStagePlanController;
  readonly eventMessages: ManagedWorkflowTurnEventMessages;
  readonly getMessageDispatch: () => SessionRequestHandlerMessageDispatch;
  readonly qualityGatesStagePlan?: QualityGatesStagePlanController;
  readonly sessionManager: Pick<SessionManager, "getSession">;
}

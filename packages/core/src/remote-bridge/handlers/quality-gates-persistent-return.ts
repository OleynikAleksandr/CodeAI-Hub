import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import type { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { SessionManager } from "../../session-manager";
import type { DevelopmentTreeQualityGatesHandoffBootstrap } from "./development-tree-quality-gates-handoff-bootstrap";

export const completeQualityGatesPersistentReturn = async (options: {
  readonly agentGateway?: DevelopmentTreeAgentSessionGateway;
  readonly productPartBootstrap: DevelopmentTreeQualityGatesHandoffBootstrap;
  readonly sessionId: string;
  readonly sessionManager: Pick<SessionManager, "getSession">;
  readonly stagePlan: QualityGatesStagePlanController;
  readonly waitForMessagePersistence?: (sessionId: string) => Promise<void>;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  await options.waitForMessagePersistence?.(options.sessionId);
  await options.stagePlan.commitTerminalHandoffResidue({
    workspaceRoot: options.workspaceRoot,
    workspaceSlug: options.workspaceSlug,
  });
  await options.productPartBootstrap.bootstrap({
    agentGateway: options.agentGateway,
    sessionId: options.sessionId,
    sessionManager: options.sessionManager,
    stagePlan: options.stagePlan,
    workspaceRoot: options.workspaceRoot,
    workspaceSlug: options.workspaceSlug,
  });
};

import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import type { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { SessionManager } from "../../session-manager";
import { DevelopmentTreeProductPartPrecodeBootstrap } from "./development-tree-product-part-precode-bootstrap";

export class DevelopmentTreeQualityGatesHandoffBootstrap {
  private readonly productPartPrecodeBootstrap =
    new DevelopmentTreeProductPartPrecodeBootstrap();

  async bootstrap(params: {
    readonly agentGateway?: DevelopmentTreeAgentSessionGateway;
    readonly sessionId: string;
    readonly sessionManager: Pick<SessionManager, "getSession">;
    readonly stagePlan: Pick<
      QualityGatesStagePlanController,
      "commitDevelopmentTreeBootstrap"
    >;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const session = params.sessionManager.getSession(params.sessionId);
    if (!session) {
      return;
    }
    await this.productPartPrecodeBootstrap.bootstrap({
      agentGateway: params.agentGateway,
      committer: params.stagePlan,
      providerId: session.providerId,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
  }
}

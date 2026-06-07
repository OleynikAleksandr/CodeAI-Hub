import type { DevelopmentTreeNodeBootstrapScanResult } from "../../development-tree/node-bootstrap/development-tree-node-bootstrap-facade";
import { DevelopmentTreeNodeBootstrapFacade } from "../../development-tree/node-bootstrap/development-tree-node-bootstrap-facade";
import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";

export interface DevelopmentTreeProductPartAgentBootstrapRequest {
  readonly agentGateway?: DevelopmentTreeAgentSessionGateway;
  readonly leadProductPartId?: string | null;
  readonly productPartLeadershipOrder?: readonly string[];
  readonly providerId?: string | null;
  readonly targetProductPartIds?: readonly string[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export const bootstrapDevelopmentTreeProductPartAgents = async (
  request: DevelopmentTreeProductPartAgentBootstrapRequest
): Promise<DevelopmentTreeNodeBootstrapScanResult> => {
  const providerId = request.providerId?.trim() || null;
  const agentSessionOptions =
    request.agentGateway && providerId
      ? {
          gateway: request.agentGateway,
          providerId,
          workspacePath: request.workspaceRoot,
          workspaceSlug: request.workspaceSlug,
        }
      : undefined;

  return await new DevelopmentTreeNodeBootstrapFacade({
    agentSessionOptions,
  }).consumeNewNodes({
    leadProductPartId: request.leadProductPartId,
    nodeKinds: ["product_part"],
    productPartLeadershipOrder: request.productPartLeadershipOrder,
    targetProductPartIds: request.targetProductPartIds,
    workspaceRoot: request.workspaceRoot,
    workspaceSlug: request.workspaceSlug,
    writeProductPartPlans: true,
  });
};

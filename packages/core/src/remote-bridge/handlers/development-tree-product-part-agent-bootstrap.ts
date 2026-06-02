import type { Request } from "express";
import { DevelopmentTreeNodeBootstrapFacade } from "../../development-tree/node-bootstrap/development-tree-node-bootstrap-facade";
import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import type { SessionManager } from "../../session-manager";

export interface DevelopmentTreeProductPartAgentBootstrapRequest {
  readonly agentGateway?: DevelopmentTreeAgentSessionGateway;
  readonly leadProductPartId?: string | null;
  readonly productPartLeadershipOrder?: readonly string[];
  readonly req: Request;
  readonly sessionManager?: SessionManager;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const resolveProviderId = (params: {
  readonly req: Request;
  readonly sessionManager?: SessionManager;
  readonly workspaceSlug: string;
}): string | null => {
  if (!params.sessionManager) {
    return null;
  }
  const query = params.req.query as Record<string, unknown>;
  const sessionId = readNonEmptyString(query.sessionId);
  if (sessionId) {
    return params.sessionManager.getSession(sessionId)?.providerId ?? null;
  }
  return (
    params.sessionManager
      .listSessions()
      .find((session) => session.initiativeSlug === params.workspaceSlug)
      ?.providerId ?? null
  );
};

export const bootstrapDevelopmentTreeProductPartAgents = async (
  request: DevelopmentTreeProductPartAgentBootstrapRequest
): Promise<void> => {
  const providerId = resolveProviderId({
    req: request.req,
    sessionManager: request.sessionManager,
    workspaceSlug: request.workspaceSlug,
  });
  const agentSessionOptions =
    request.agentGateway && providerId
      ? {
          gateway: request.agentGateway,
          providerId,
          workspacePath: request.workspaceRoot,
          workspaceSlug: request.workspaceSlug,
        }
      : undefined;

  await new DevelopmentTreeNodeBootstrapFacade({
    agentSessionOptions,
  }).consumeNewNodes({
    leadProductPartId: request.leadProductPartId,
    nodeKinds: ["product_part"],
    productPartLeadershipOrder: request.productPartLeadershipOrder,
    workspaceRoot: request.workspaceRoot,
    workspaceSlug: request.workspaceSlug,
    writeProductPartPlans: true,
  });
};

import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
import { NodeFirstMessageBuilder } from "./node-first-message-builder";

export interface DevelopmentTreeAgentSessionGateway {
  readonly createSessionForWorkflow: (options: {
    readonly context: {
      readonly initiativeSlug: string;
      readonly runSlug?: string | null;
      readonly stage: string;
    };
    readonly providerId: string;
    readonly workspacePath: string;
  }) => Promise<{ readonly id: string } | null>;
  readonly handleMessage: (sessionId: string, content: string) => Promise<void>;
}

export interface NodeAgentSessionBootstrapperOptions {
  readonly gateway: DevelopmentTreeAgentSessionGateway;
  readonly providerId: string;
  readonly technologyBase?: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

export interface NodeAgentSessionBootstrapResult {
  readonly draftFileNames: readonly string[];
  readonly firstMessageSent: boolean;
  readonly node: DevelopmentTreeDetectedNode;
  readonly requiresTechnologyBaseAnswer: boolean;
  readonly sessionId: string | null;
  readonly stage: string;
}

const STAGE_SEGMENT_PATTERN = /[^a-zA-Z0-9_.-]+/g;
const STAGE_BOUNDARY_PATTERN = /^-+|-+$/g;

const sanitizeStageSegment = (value: string): string =>
  value
    .trim()
    .replace(STAGE_SEGMENT_PATTERN, "-")
    .replace(STAGE_BOUNDARY_PATTERN, "");

const createStageId = (node: DevelopmentTreeDetectedNode): string =>
  [
    "development-tree",
    node.kind,
    node.partId,
    node.clusterId ?? "standalone",
    node.id,
  ]
    .map(sanitizeStageSegment)
    .filter((segment) => segment.length > 0)
    .join(".");

export class NodeAgentSessionBootstrapper {
  private readonly firstMessageBuilder = new NodeFirstMessageBuilder();

  async bootstrapNode(
    node: DevelopmentTreeDetectedNode,
    options: NodeAgentSessionBootstrapperOptions
  ): Promise<NodeAgentSessionBootstrapResult> {
    const stage = createStageId(node);
    const session = await options.gateway.createSessionForWorkflow({
      providerId: options.providerId,
      workspacePath: options.workspacePath,
      context: {
        initiativeSlug: options.workspaceSlug,
        runSlug: "development-tree",
        stage,
      },
    });
    const firstMessage = this.firstMessageBuilder.build({
      node,
      technologyBase: options.technologyBase,
    });
    if (session) {
      await options.gateway.handleMessage(session.id, firstMessage.content);
    }
    return {
      draftFileNames: firstMessage.draftFileNames,
      firstMessageSent: Boolean(session),
      node,
      requiresTechnologyBaseAnswer: firstMessage.requiresTechnologyBaseAnswer,
      sessionId: session?.id ?? null,
      stage,
    };
  }
}

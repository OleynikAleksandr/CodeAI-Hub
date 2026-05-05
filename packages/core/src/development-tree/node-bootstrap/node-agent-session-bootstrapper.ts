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
  readonly providerId: string | (() => Promise<string> | string);
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

const CODEAI_HUB_SEGMENT = ".codeai-hub";
const WORKFLOW_PATH_SEPARATOR_RE = /[\\/]+/;

const splitWorkflowPath = (value: string): readonly string[] =>
  value
    .split(WORKFLOW_PATH_SEPARATOR_RE)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

const stripCodeAiWorkspacePrefix = (
  segments: readonly string[],
  workspaceSlug: string
): readonly string[] =>
  segments[0] === CODEAI_HUB_SEGMENT && segments[1] === workspaceSlug
    ? segments.slice(2)
    : segments;

const createNodeWorkflowPath = (
  node: DevelopmentTreeDetectedNode,
  workspaceSlug: string
): string =>
  stripCodeAiWorkspacePrefix(
    splitWorkflowPath(node.relativePath),
    workspaceSlug
  ).join("/");

const resolveProviderId = async (
  providerId: NodeAgentSessionBootstrapperOptions["providerId"]
): Promise<string> =>
  typeof providerId === "function" ? await providerId() : providerId;

export class NodeAgentSessionBootstrapper {
  private readonly firstMessageBuilder = new NodeFirstMessageBuilder();

  async bootstrapNode(
    node: DevelopmentTreeDetectedNode,
    options: NodeAgentSessionBootstrapperOptions
  ): Promise<NodeAgentSessionBootstrapResult> {
    const stage = createNodeWorkflowPath(node, options.workspaceSlug);
    const providerId = await resolveProviderId(options.providerId);
    const session = await options.gateway.createSessionForWorkflow({
      providerId,
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

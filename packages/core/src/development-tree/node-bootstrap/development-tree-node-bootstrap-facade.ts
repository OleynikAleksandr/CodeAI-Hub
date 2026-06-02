import {
  type ProductPartDevelopmentBriefPlanWriteResult,
  ProductPartDevelopmentBriefPlanWriter,
} from "../product-part-workflow/product-part-development-brief-plan-writer";
import {
  DevelopmentTreeFilesystemWatcher,
  type DevelopmentTreeFilesystemWatcherRequest,
} from "./development-tree-filesystem-watcher";
import { DevelopmentTreeNodeBootstrapState } from "./development-tree-node-bootstrap-state";
import type {
  DevelopmentTreeDetectedNode,
  DevelopmentTreeDetectedNodeKind,
} from "./development-tree-node-detector";
import type { DevelopmentTreeWrittenDraft } from "./draft-writer";
import { DraftWriter } from "./draft-writer";
import {
  NodeAgentSessionBootstrapper,
  type NodeAgentSessionBootstrapperOptions,
  type NodeAgentSessionBootstrapResult,
} from "./node-agent-session-bootstrapper";

export interface DevelopmentTreeNodeBootstrapScanResult {
  readonly agentSessions: readonly NodeAgentSessionBootstrapResult[];
  readonly newNodes: readonly DevelopmentTreeDetectedNode[];
  readonly processedCount: number;
  readonly writtenDrafts: readonly DevelopmentTreeWrittenDraft[];
  readonly writtenProductPartPlans: readonly ProductPartDevelopmentBriefPlanWriteResult[];
}

export interface DevelopmentTreeNodeBootstrapFacadeOptions {
  readonly agentSessionOptions?: NodeAgentSessionBootstrapperOptions;
}

export interface DevelopmentTreeNodeBootstrapRequest
  extends DevelopmentTreeFilesystemWatcherRequest {
  readonly leadProductPartId?: string | null;
  readonly nodeKinds?: readonly DevelopmentTreeDetectedNodeKind[];
  readonly productPartLeadershipOrder?: readonly string[];
  readonly writeProductPartPlans?: boolean;
}

export class DevelopmentTreeNodeBootstrapFacade {
  private readonly agentSessionOptions?: NodeAgentSessionBootstrapperOptions;
  private readonly agentSessionBootstrapper =
    new NodeAgentSessionBootstrapper();
  private readonly draftWriter = new DraftWriter();
  private readonly productPartPlanWriter =
    new ProductPartDevelopmentBriefPlanWriter();
  private readonly state = new DevelopmentTreeNodeBootstrapState();
  private readonly watcher = new DevelopmentTreeFilesystemWatcher();

  constructor(options: DevelopmentTreeNodeBootstrapFacadeOptions = {}) {
    this.agentSessionOptions = options.agentSessionOptions;
  }

  async consumeNewNodes(
    params: DevelopmentTreeNodeBootstrapRequest
  ): Promise<DevelopmentTreeNodeBootstrapScanResult> {
    const nodes = (await this.watcher.scan(params)).filter(
      (node) => !params.nodeKinds || params.nodeKinds.includes(node.kind)
    );
    const newNodes = this.state.filterUnprocessed(nodes);
    const agentSessions: NodeAgentSessionBootstrapResult[] = [];
    const writtenDrafts: DevelopmentTreeWrittenDraft[] = [];
    const writtenProductPartPlans: ProductPartDevelopmentBriefPlanWriteResult[] =
      [];
    for (const node of newNodes) {
      if (params.writeProductPartPlans) {
        const plan = await this.productPartPlanWriter.writePlan({
          leadProductPartId: params.leadProductPartId,
          node,
          productPartLeadershipOrder: params.productPartLeadershipOrder,
          workspaceRoot: params.workspaceRoot,
          workspaceSlug: params.workspaceSlug,
        });
        if (plan) {
          writtenProductPartPlans.push(plan);
        }
      }
      const result = await this.draftWriter.writeDrafts({ node });
      writtenDrafts.push(...result.drafts);
      const hasDraftChanges = result.drafts.some(
        (draft) => draft.action !== "unchanged"
      );
      if (this.agentSessionOptions && hasDraftChanges) {
        agentSessions.push(
          await this.agentSessionBootstrapper.bootstrapNode(
            node,
            this.agentSessionOptions
          )
        );
      }
    }
    this.state.markProcessed(newNodes);
    return {
      agentSessions,
      newNodes,
      processedCount: this.state.processedCount(),
      writtenProductPartPlans,
      writtenDrafts,
    };
  }
}

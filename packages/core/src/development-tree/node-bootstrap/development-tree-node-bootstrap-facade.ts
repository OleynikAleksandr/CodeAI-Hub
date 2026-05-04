import {
  DevelopmentTreeFilesystemWatcher,
  type DevelopmentTreeFilesystemWatcherRequest,
} from "./development-tree-filesystem-watcher";
import { DevelopmentTreeNodeBootstrapState } from "./development-tree-node-bootstrap-state";
import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
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
}

export interface DevelopmentTreeNodeBootstrapFacadeOptions {
  readonly agentSessionOptions?: NodeAgentSessionBootstrapperOptions;
}

export class DevelopmentTreeNodeBootstrapFacade {
  private readonly agentSessionOptions?: NodeAgentSessionBootstrapperOptions;
  private readonly agentSessionBootstrapper =
    new NodeAgentSessionBootstrapper();
  private readonly draftWriter = new DraftWriter();
  private readonly state = new DevelopmentTreeNodeBootstrapState();
  private readonly watcher = new DevelopmentTreeFilesystemWatcher();

  constructor(options: DevelopmentTreeNodeBootstrapFacadeOptions = {}) {
    this.agentSessionOptions = options.agentSessionOptions;
  }

  async consumeNewNodes(
    params: DevelopmentTreeFilesystemWatcherRequest
  ): Promise<DevelopmentTreeNodeBootstrapScanResult> {
    const nodes = await this.watcher.scan(params);
    const newNodes = this.state.filterUnprocessed(nodes);
    const agentSessions: NodeAgentSessionBootstrapResult[] = [];
    const writtenDrafts: DevelopmentTreeWrittenDraft[] = [];
    for (const node of newNodes) {
      const result = await this.draftWriter.writeDrafts({ node });
      writtenDrafts.push(...result.drafts);
      if (this.agentSessionOptions) {
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
      writtenDrafts,
    };
  }
}

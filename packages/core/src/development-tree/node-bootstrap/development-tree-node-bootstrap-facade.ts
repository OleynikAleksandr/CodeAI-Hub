import {
  DevelopmentTreeFilesystemWatcher,
  type DevelopmentTreeFilesystemWatcherRequest,
} from "./development-tree-filesystem-watcher";
import { DevelopmentTreeNodeBootstrapState } from "./development-tree-node-bootstrap-state";
import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";

export interface DevelopmentTreeNodeBootstrapScanResult {
  readonly newNodes: readonly DevelopmentTreeDetectedNode[];
  readonly processedCount: number;
}

export class DevelopmentTreeNodeBootstrapFacade {
  private readonly state = new DevelopmentTreeNodeBootstrapState();
  private readonly watcher = new DevelopmentTreeFilesystemWatcher();

  async consumeNewNodes(
    params: DevelopmentTreeFilesystemWatcherRequest
  ): Promise<DevelopmentTreeNodeBootstrapScanResult> {
    const nodes = await this.watcher.scan(params);
    const newNodes = this.state.filterUnprocessed(nodes);
    this.state.markProcessed(newNodes);
    return {
      newNodes,
      processedCount: this.state.processedCount(),
    };
  }
}

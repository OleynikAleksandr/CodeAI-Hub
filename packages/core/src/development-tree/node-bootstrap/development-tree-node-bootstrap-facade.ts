import {
  DevelopmentTreeFilesystemWatcher,
  type DevelopmentTreeFilesystemWatcherRequest,
} from "./development-tree-filesystem-watcher";
import { DevelopmentTreeNodeBootstrapState } from "./development-tree-node-bootstrap-state";
import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
import type { DevelopmentTreeWrittenDraft } from "./draft-writer";
import { DraftWriter } from "./draft-writer";

export interface DevelopmentTreeNodeBootstrapScanResult {
  readonly newNodes: readonly DevelopmentTreeDetectedNode[];
  readonly processedCount: number;
  readonly writtenDrafts: readonly DevelopmentTreeWrittenDraft[];
}

export class DevelopmentTreeNodeBootstrapFacade {
  private readonly draftWriter = new DraftWriter();
  private readonly state = new DevelopmentTreeNodeBootstrapState();
  private readonly watcher = new DevelopmentTreeFilesystemWatcher();

  async consumeNewNodes(
    params: DevelopmentTreeFilesystemWatcherRequest
  ): Promise<DevelopmentTreeNodeBootstrapScanResult> {
    const nodes = await this.watcher.scan(params);
    const newNodes = this.state.filterUnprocessed(nodes);
    const writtenDrafts: DevelopmentTreeWrittenDraft[] = [];
    for (const node of newNodes) {
      const result = await this.draftWriter.writeDrafts({ node });
      writtenDrafts.push(...result.drafts);
    }
    this.state.markProcessed(newNodes);
    return {
      newNodes,
      processedCount: this.state.processedCount(),
      writtenDrafts,
    };
  }
}

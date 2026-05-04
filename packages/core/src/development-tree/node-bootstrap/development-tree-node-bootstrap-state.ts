import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";

const createNodeKey = (node: DevelopmentTreeDetectedNode): string =>
  `${node.kind}:${node.relativePath}`;

export class DevelopmentTreeNodeBootstrapState {
  private readonly processedNodeKeys = new Set<string>();

  filterUnprocessed(
    nodes: readonly DevelopmentTreeDetectedNode[]
  ): readonly DevelopmentTreeDetectedNode[] {
    return nodes.filter(
      (node) => !this.processedNodeKeys.has(createNodeKey(node))
    );
  }

  markProcessed(nodes: readonly DevelopmentTreeDetectedNode[]): void {
    for (const node of nodes) {
      this.processedNodeKeys.add(createNodeKey(node));
    }
  }

  processedCount(): number {
    return this.processedNodeKeys.size;
  }
}

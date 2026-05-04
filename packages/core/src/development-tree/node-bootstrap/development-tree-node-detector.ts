import { readdir } from "node:fs/promises";
import path from "node:path";

export type DevelopmentTreeDetectedNodeKind =
  | "cluster"
  | "module"
  | "product_part";

export interface DevelopmentTreeDetectedNode {
  readonly absolutePath: string;
  readonly clusterId?: string;
  readonly id: string;
  readonly kind: DevelopmentTreeDetectedNodeKind;
  readonly partId: string;
  readonly relativePath: string;
}

export interface DevelopmentTreeNodeDetectorRequest {
  readonly materializedRootAbsolutePath: string;
  readonly materializedRootRelativePath: string;
}

const listDirectoryNames = async (absolutePath: string): Promise<string[]> => {
  const entries = await readdir(absolutePath, { withFileTypes: true }).catch(
    () => []
  );
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("_"));
};

const createNode = (params: {
  readonly clusterId?: string;
  readonly id: string;
  readonly kind: DevelopmentTreeDetectedNodeKind;
  readonly materializedRootAbsolutePath: string;
  readonly materializedRootRelativePath: string;
  readonly partId: string;
  readonly segments: readonly string[];
}): DevelopmentTreeDetectedNode => ({
  id: params.id,
  kind: params.kind,
  partId: params.partId,
  relativePath: path.posix.join(
    params.materializedRootRelativePath,
    ...params.segments
  ),
  absolutePath: path.join(
    params.materializedRootAbsolutePath,
    ...params.segments
  ),
  ...(params.clusterId ? { clusterId: params.clusterId } : {}),
});

export class DevelopmentTreeNodeDetector {
  async detect(
    params: DevelopmentTreeNodeDetectorRequest
  ): Promise<readonly DevelopmentTreeDetectedNode[]> {
    const nodes: DevelopmentTreeDetectedNode[] = [];
    const partIds = await listDirectoryNames(
      path.join(params.materializedRootAbsolutePath, "product-parts")
    );
    for (const partId of partIds) {
      const partSegments = ["product-parts", partId];
      nodes.push(
        createNode({
          ...params,
          id: partId,
          kind: "product_part",
          partId,
          segments: partSegments,
        })
      );
      await this.collectClusterNodes(params, nodes, partId, partSegments);
      await this.collectStandaloneModuleNodes(
        params,
        nodes,
        partId,
        partSegments
      );
    }
    return nodes;
  }

  private async collectClusterNodes(
    params: DevelopmentTreeNodeDetectorRequest,
    nodes: DevelopmentTreeDetectedNode[],
    partId: string,
    partSegments: readonly string[]
  ): Promise<void> {
    const clusterIds = await listDirectoryNames(
      path.join(
        params.materializedRootAbsolutePath,
        ...partSegments,
        "clusters"
      )
    );
    for (const clusterId of clusterIds) {
      const clusterSegments = [...partSegments, "clusters", clusterId];
      nodes.push(
        createNode({
          ...params,
          id: clusterId,
          kind: "cluster",
          partId,
          clusterId,
          segments: clusterSegments,
        })
      );
      const moduleIds = await listDirectoryNames(
        path.join(
          params.materializedRootAbsolutePath,
          ...clusterSegments,
          "modules"
        )
      );
      for (const moduleId of moduleIds) {
        nodes.push(
          createNode({
            ...params,
            id: moduleId,
            kind: "module",
            partId,
            clusterId,
            segments: [...clusterSegments, "modules", moduleId],
          })
        );
      }
    }
  }

  private async collectStandaloneModuleNodes(
    params: DevelopmentTreeNodeDetectorRequest,
    nodes: DevelopmentTreeDetectedNode[],
    partId: string,
    partSegments: readonly string[]
  ): Promise<void> {
    const moduleIds = await listDirectoryNames(
      path.join(params.materializedRootAbsolutePath, ...partSegments, "modules")
    );
    for (const moduleId of moduleIds) {
      nodes.push(
        createNode({
          ...params,
          id: moduleId,
          kind: "module",
          partId,
          segments: [...partSegments, "modules", moduleId],
        })
      );
    }
  }
}

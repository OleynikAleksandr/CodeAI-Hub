import { createDevelopmentTreeMaterializedRoot } from "../filesystem-structurator/development-tree-filesystem-paths";
import {
  type DevelopmentTreeDetectedNode,
  DevelopmentTreeNodeDetector,
} from "./development-tree-node-detector";

export interface DevelopmentTreeFilesystemWatcherRequest {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export class DevelopmentTreeFilesystemWatcher {
  private readonly detector = new DevelopmentTreeNodeDetector();

  async scan(
    params: DevelopmentTreeFilesystemWatcherRequest
  ): Promise<readonly DevelopmentTreeDetectedNode[]> {
    const root = createDevelopmentTreeMaterializedRoot(params);
    return await this.detector.detect({
      materializedRootAbsolutePath: root.absolutePath,
      materializedRootRelativePath: root.relativePath,
    });
  }
}

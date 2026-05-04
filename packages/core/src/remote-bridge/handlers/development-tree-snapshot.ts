import { DevelopmentTreeStateFacade } from "../../development-tree/development-tree-state-facade";
import type {
  DevelopmentTreeSnapshot,
  DevelopmentTreeSnapshotRequest,
} from "../../development-tree/development-tree-types";

export type {
  DevelopmentTreeClusterNode,
  DevelopmentTreeDraftReadiness,
  DevelopmentTreeModuleNode,
  DevelopmentTreePartNode,
  DevelopmentTreeSnapshot,
} from "../../development-tree/development-tree-types";

export const readDevelopmentTreeSnapshot = async (
  params: DevelopmentTreeSnapshotRequest
): Promise<DevelopmentTreeSnapshot> =>
  new DevelopmentTreeStateFacade().currentSnapshot(params);

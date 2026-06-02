import path from "node:path";
import type { DevelopmentTreeOperationNode } from "./development-tree-types";

export const createArtifactWorkspacePath = (
  workspaceSlug: string,
  workflowPath: string
): string => path.posix.join(".codeai-hub", workspaceSlug, workflowPath);

export const createLeadProductPartOperationNodes = (
  _partWorkflowPath: string,
  _workspaceSlug: string
): readonly DevelopmentTreeOperationNode[] => [];

export const createModuleOperationNodes = (
  _moduleWorkflowPath: string,
  _workspaceSlug: string
): readonly DevelopmentTreeOperationNode[] => [];

export const createClusterOperationNodes = (
  _clusterWorkflowPath: string,
  _workspaceSlug: string
): readonly DevelopmentTreeOperationNode[] => [];

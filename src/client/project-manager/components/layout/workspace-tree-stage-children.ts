import type { WorkflowStageId, WorkflowStateSnapshot } from "../../services/workflow-state-client";
import type { SessionResumeIntent } from "./workspace-tree-auto-select";
import {
  buildDescriptionBranchNodes,
  buildVirtualSimulationBranchNodes,
  buildDiagramModulesBranchNodes,
  buildDiagramFacadesBranchNodes,
} from "./workspace-tree-branch-nodes";
import type { TreeNode } from "./workspace-tree-model";

export type StageChildrenContext = {
  readonly workflowState: WorkflowStateSnapshot;
  readonly workspaceSlug: string | null;
  readonly workspacePath?: string;
  readonly virtualSimulationArtifactAvailable: boolean;
  readonly diagramModulesArtifactAvailable: boolean;
  readonly diagramFacadesArtifactAvailable: boolean;
  readonly selectArtifact: (artifactPath: string, label: string) => void;
  readonly dispatchDialogOpenIntent: (payload: SessionResumeIntent) => void;
  readonly clearArtifactWithTool: (activeTool: string) => void;
};

export const resolveStageChildren = (
  stage: WorkflowStageId,
  ctx: StageChildrenContext
): readonly TreeNode[] => {
  if (stage === "description") {
    return buildDescriptionBranchNodes({
      workflowState: ctx.workflowState,
      workspaceSlug: ctx.workspaceSlug,
      workspacePath: ctx.workspacePath,
      selectArtifact: ctx.selectArtifact,
      dispatchDialogOpenIntent: ctx.dispatchDialogOpenIntent,
    });
  }
  if (stage === "virtual_simulation") {
    return buildVirtualSimulationBranchNodes({
      workflowState: ctx.workflowState,
      virtualSimulationArtifactAvailable: ctx.virtualSimulationArtifactAvailable,
      workspaceSlug: ctx.workspaceSlug,
      workspacePath: ctx.workspacePath,
      selectArtifact: ctx.selectArtifact,
      dispatchDialogOpenIntent: ctx.dispatchDialogOpenIntent,
      clearArtifactWithTool: ctx.clearArtifactWithTool,
    });
  }
  if (stage === "diagram_modules") {
    return buildDiagramModulesBranchNodes({
      workflowState: ctx.workflowState,
      diagramModulesArtifactAvailable: ctx.diagramModulesArtifactAvailable,
      workspaceSlug: ctx.workspaceSlug,
      workspacePath: ctx.workspacePath,
      selectArtifact: ctx.selectArtifact,
      dispatchDialogOpenIntent: ctx.dispatchDialogOpenIntent,
      clearArtifactWithTool: ctx.clearArtifactWithTool,
    });
  }
  if (stage === "diagram_facades") {
    return buildDiagramFacadesBranchNodes({
      workflowState: ctx.workflowState,
      diagramFacadesArtifactAvailable: ctx.diagramFacadesArtifactAvailable,
      workspaceSlug: ctx.workspaceSlug,
      workspacePath: ctx.workspacePath,
      selectArtifact: ctx.selectArtifact,
      dispatchDialogOpenIntent: ctx.dispatchDialogOpenIntent,
      clearArtifactWithTool: ctx.clearArtifactWithTool,
    });
  }
  return [];
};

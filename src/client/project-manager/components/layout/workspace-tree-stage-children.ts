import type { WorkflowStageId, WorkflowStateSnapshot } from "../../services/workflow-state-client";
import type { SessionResumeIntent } from "./workspace-tree-auto-select";
import {
  buildApplicationFoundationEnvelopeBranchNodes,
  buildDescriptionBranchNodes,
  buildVirtualSimulationBranchNodes,
  buildDiagramModulesBranchNodes,
} from "./workspace-tree-branch-nodes";
import type { TreeNode } from "./workspace-tree-model";

export type StageChildrenContext = {
  readonly workflowState: WorkflowStateSnapshot;
  readonly workspaceSlug: string | null;
  readonly workspacePath?: string;
  readonly descriptionArtifactAvailable: boolean;
  readonly virtualSimulationArtifactAvailable: boolean;
  readonly diagramModulesArtifactAvailable: boolean;
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
      descriptionArtifactAvailable: ctx.descriptionArtifactAvailable,
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
  if (stage === "application_foundation_envelope") {
    return buildApplicationFoundationEnvelopeBranchNodes({
      workflowState: ctx.workflowState,
      workspaceSlug: ctx.workspaceSlug,
      workspacePath: ctx.workspacePath,
      dispatchDialogOpenIntent: ctx.dispatchDialogOpenIntent,
      clearArtifactWithTool: ctx.clearArtifactWithTool,
    });
  }
  return [];
};

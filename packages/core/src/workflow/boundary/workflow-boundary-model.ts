import type { WorkflowStageId } from "../watcher/watcher-types";

export const WORKFLOW_BOUNDARY_REGISTRY_VERSION = 1;

const WORKFLOW_BOUNDARY_STAGES = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];

const WORKFLOW_BOUNDARY_LABELS: Record<WorkflowStageId, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
  application_skeleton: "Application Skeleton",
  quality_gates: "Quality Gates",
};

export interface WorkflowBoundaryEntry {
  readonly boundaryHash: string;
  readonly commitMessage: string;
  readonly createdAt: string;
  readonly registryVersion: typeof WORKFLOW_BOUNDARY_REGISTRY_VERSION;
  readonly stage: WorkflowStageId;
  readonly stageLabel: string;
  readonly workspaceSlug: string;
}

export interface WorkflowBoundaryRegistry {
  readonly entries: readonly WorkflowBoundaryEntry[];
  readonly registryVersion: typeof WORKFLOW_BOUNDARY_REGISTRY_VERSION;
  readonly updatedAt: string;
  readonly workspaceSlug: string;
}

export interface WorkflowBoundaryCommitResult {
  readonly hash: string;
  readonly noStagedChanges: boolean;
}

export interface WorkflowBoundaryEnsureResult {
  readonly boundaryHash: string;
  readonly created: boolean;
  readonly registryPath: string;
  readonly stage: WorkflowStageId;
}

export interface WorkflowBoundaryGitCommitParams {
  readonly allowEmpty?: boolean;
  readonly commitMessage: string;
  readonly paths?: readonly string[];
  readonly workspaceRoot: string;
}

export interface WorkflowBoundaryGitCleanParams {
  readonly paths: readonly string[];
  readonly workspaceRoot: string;
}

export interface WorkflowBoundaryGitResetParams {
  readonly hash: string;
  readonly workspaceRoot: string;
}

export interface WorkflowBoundaryRestoreResult {
  readonly boundaryHash: string;
  readonly clearCommitHash: string;
  readonly prunedStages: readonly WorkflowStageId[];
  readonly registryPath: string;
  readonly stage: WorkflowStageId;
}

export const compareWorkflowBoundaryStages = (
  left: WorkflowStageId,
  right: WorkflowStageId
): number =>
  WORKFLOW_BOUNDARY_STAGES.indexOf(left) -
  WORKFLOW_BOUNDARY_STAGES.indexOf(right);

export const getWorkflowBoundaryStageLabel = (stage: WorkflowStageId): string =>
  WORKFLOW_BOUNDARY_LABELS[stage];

export const isWorkflowBoundaryStage = (
  value: string
): value is WorkflowStageId =>
  WORKFLOW_BOUNDARY_STAGES.includes(value as WorkflowStageId);

export const isStageAtOrAfter = (
  stage: WorkflowStageId,
  boundaryStage: WorkflowStageId
): boolean => compareWorkflowBoundaryStages(stage, boundaryStage) >= 0;

export const buildWorkflowBoundaryCommitMessage = (
  stage: WorkflowStageId
): string => `codeai-boundary: ${getWorkflowBoundaryStageLabel(stage)}`;

export const buildWorkflowClearCommitMessage = (
  stage: WorkflowStageId
): string => `codeai-clear: ${getWorkflowBoundaryStageLabel(stage)}`;

export const buildWorkflowBoundaryRegistryCommitMessage = (
  stage: WorkflowStageId
): string =>
  `codeai-boundary-registry: ${getWorkflowBoundaryStageLabel(stage)}`;

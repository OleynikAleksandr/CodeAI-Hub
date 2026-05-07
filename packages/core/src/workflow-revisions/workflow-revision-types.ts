import type { WorkflowStageId } from "../workflow/watcher/watcher-types";

export type WorkflowRevisionStageId =
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

export interface WorkflowRevisionArtifact {
  readonly content: string;
  readonly relativePath: string;
}

export interface WorkflowRevisionArtifactSummary {
  readonly relativePath: string;
  readonly sha256: string;
}

export interface WorkflowRevisionSnapshot {
  readonly artifacts: readonly WorkflowRevisionArtifactSummary[];
  readonly createdAt: string;
  readonly id: string;
  readonly metadata: Record<string, string>;
  readonly schema: "codeai-workflow-revision-v1";
  readonly stage: WorkflowRevisionStageId;
  readonly workspaceSlug: string;
}

export interface WorkflowRevisionRecord extends WorkflowRevisionSnapshot {
  readonly artifactContents: readonly WorkflowRevisionArtifact[];
}

export interface SaveWorkflowRevisionRequest {
  readonly artifacts: readonly WorkflowRevisionArtifact[];
  readonly createdAt?: string;
  readonly metadata?: Record<string, string>;
  readonly stage: WorkflowRevisionStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface WorkflowRevisionStoreResult {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly snapshot: WorkflowRevisionSnapshot;
}

export const isWorkflowRevisionStage = (
  stage: WorkflowStageId | string
): stage is WorkflowRevisionStageId =>
  stage === "diagram_modules" ||
  stage === "application_skeleton" ||
  stage === "quality_gates";

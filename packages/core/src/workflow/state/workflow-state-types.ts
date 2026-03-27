import type { WorkflowStageId } from "../watcher/watcher-types";

export type WorkflowStageStatus =
  | "idle"
  | "in_progress"
  | "completed"
  | "invalid"
  | "outdated";

export interface WorkflowArtifactState {
  readonly path: string;
  readonly updatedAt: string;
}

export type WorkflowGateStatus = "started" | "passed" | "failed";

export interface WorkflowGateState {
  readonly detail?: string;
  readonly gateId: string;
  readonly stage?: WorkflowStageId;
  readonly status: WorkflowGateStatus;
  readonly updatedAt: string;
}

export interface WorkflowStageState {
  readonly artifacts: readonly WorkflowArtifactState[];
  readonly gates: readonly WorkflowGateState[];
  readonly stage: WorkflowStageId;
  readonly status: WorkflowStageStatus;
  readonly updatedAt: string;
}

export interface WorkflowState {
  readonly gates: readonly WorkflowGateState[];
  readonly stages: Record<WorkflowStageId, WorkflowStageState>;
  readonly updatedAt: string;
  readonly workspaceSlug: string;
}

export type WorkflowStateListener = (state: WorkflowState) => void;

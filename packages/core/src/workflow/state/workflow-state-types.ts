import type { WorkflowStageId } from "../watcher/watcher-types";

export type WorkflowStageStatus =
  | "idle"
  | "in_progress"
  | "completed"
  | "invalid";

export type WorkflowArtifactState = {
  readonly path: string;
  readonly updatedAt: string;
};

export type WorkflowGateStatus = "started" | "passed" | "failed";

export type WorkflowGateState = {
  readonly gateId: string;
  readonly status: WorkflowGateStatus;
  readonly updatedAt: string;
  readonly stage?: WorkflowStageId;
  readonly runSlug?: string;
  readonly detail?: string;
};

export type WorkflowStageState = {
  readonly stage: WorkflowStageId;
  readonly status: WorkflowStageStatus;
  readonly runSlug?: string;
  readonly artifacts: readonly WorkflowArtifactState[];
  readonly gates: readonly WorkflowGateState[];
  readonly updatedAt: string;
};

export type WorkflowState = {
  readonly workspaceSlug: string;
  readonly stages: Record<WorkflowStageId, WorkflowStageState>;
  readonly gates: readonly WorkflowGateState[];
  readonly updatedAt: string;
};

export type WorkflowStateListener = (state: WorkflowState) => void;

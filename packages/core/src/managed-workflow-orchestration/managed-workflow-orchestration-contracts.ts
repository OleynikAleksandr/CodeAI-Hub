export type ManagedWorkflowStageId =
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

export type ManagedWorkflowPhaseType =
  | "core_gated"
  | "user_led_review"
  | "persistent_user_return";

export type ManagedWorkflowRuntimeMode = "preview";

export interface ManagedWorkflowStageDescriptor {
  readonly displayName: string;
  readonly phaseTypes: readonly ManagedWorkflowPhaseType[];
  readonly stageId: ManagedWorkflowStageId;
}

export interface ManagedWorkflowStageStartRequest {
  readonly providerId: string;
  readonly runSlug?: string | null;
  readonly stageId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface ManagedWorkflowStageStartDecision {
  readonly canDispatchProvider: false;
  readonly code: "managed_workflow_preview_boundary";
  readonly controllerId: ManagedWorkflowStageId;
  readonly message: string;
  readonly mode: ManagedWorkflowRuntimeMode;
  readonly stage: ManagedWorkflowStageDescriptor;
}

export interface ManagedWorkflowOrchestrationFacadeContract {
  canHandleStage(stageId: string): stageId is ManagedWorkflowStageId;
  describeStage(stageId: string): ManagedWorkflowStageDescriptor | null;
  listRegisteredStages(): readonly ManagedWorkflowStageDescriptor[];
  previewStageStart(
    request: ManagedWorkflowStageStartRequest
  ): ManagedWorkflowStageStartDecision | null;
}

export type {
  ManagedWorkflowEffect,
  ManagedWorkflowEffectKind,
} from "./managed-workflow-effects";
export type {
  ManagedWorkflowEvent,
  ManagedWorkflowEventKind,
} from "./managed-workflow-events";
export type {
  ManagedWorkflowRunStatus,
  ManagedWorkflowSnapshot,
} from "./managed-workflow-snapshot";

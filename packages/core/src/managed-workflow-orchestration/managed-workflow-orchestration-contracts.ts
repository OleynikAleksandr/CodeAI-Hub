import type { ManagedWorkflowEffect } from "./managed-workflow-effects";
import type { ManagedWorkflowSnapshot } from "./managed-workflow-snapshot";

export type ManagedWorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

export type ManagedWorkflowPhaseType =
  | "provider_direct"
  | "core_gated"
  | "user_led_review"
  | "persistent_user_return";

export type ManagedWorkflowRuntimeMode =
  | "managed_dispatch"
  | "preview"
  | "provider_direct";
export type ManagedWorkflowStageStartPolicy =
  | "managed_dispatch"
  | "provider_direct"
  | "core_preview_boundary";

export interface ManagedWorkflowStageDescriptor {
  readonly displayName: string;
  readonly phaseTypes: readonly ManagedWorkflowPhaseType[];
  readonly stageId: ManagedWorkflowStageId;
  readonly startPolicy?: ManagedWorkflowStageStartPolicy;
}

export interface ManagedWorkflowStageStartRequest {
  readonly providerId: string;
  readonly runSlug?: string | null;
  readonly stageId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface ManagedWorkflowProviderTurnValidationRequest {
  readonly occurredAt: string;
  readonly providerId: string;
  readonly sessionId: string;
  readonly stageId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface ManagedWorkflowPreviewBoundaryStartDecision {
  readonly canDispatchProvider: false;
  readonly code: "managed_workflow_preview_boundary";
  readonly controllerId: ManagedWorkflowStageId;
  readonly message: string;
  readonly mode: "preview";
  readonly stage: ManagedWorkflowStageDescriptor;
}

export interface ManagedWorkflowProviderDirectStartDecision {
  readonly canDispatchProvider: true;
  readonly code: "managed_workflow_provider_direct";
  readonly controllerId: ManagedWorkflowStageId;
  readonly message: "";
  readonly mode: "provider_direct";
  readonly stage: ManagedWorkflowStageDescriptor;
}

export interface ManagedWorkflowManagedDispatchStartDecision {
  readonly canDispatchProvider: true;
  readonly code: "managed_workflow_managed_dispatch";
  readonly controllerId: ManagedWorkflowStageId;
  readonly message: string;
  readonly mode: "managed_dispatch";
  readonly stage: ManagedWorkflowStageDescriptor;
}

export type ManagedWorkflowStageStartDecision =
  | ManagedWorkflowManagedDispatchStartDecision
  | ManagedWorkflowPreviewBoundaryStartDecision
  | ManagedWorkflowProviderDirectStartDecision;

export interface ManagedWorkflowProviderTurnValidationDecision {
  readonly accepted: boolean;
  readonly effects: readonly ManagedWorkflowEffect[];
  readonly reasons: readonly string[];
  readonly snapshot: ManagedWorkflowSnapshot;
}

export interface ManagedWorkflowOrchestrationFacadeContract {
  canHandleStage(stageId: string): stageId is ManagedWorkflowStageId;
  describeStage(stageId: string): ManagedWorkflowStageDescriptor | null;
  listRegisteredStages(): readonly ManagedWorkflowStageDescriptor[];
  previewStageStart(
    request: ManagedWorkflowStageStartRequest
  ): ManagedWorkflowPreviewBoundaryStartDecision | null;
  resolveStageStart(
    request: ManagedWorkflowStageStartRequest
  ): ManagedWorkflowStageStartDecision | null;
  validateProviderTurn(
    request: ManagedWorkflowProviderTurnValidationRequest
  ): Promise<ManagedWorkflowProviderTurnValidationDecision | null>;
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

import type { ManagedWorkflowStageId } from "./managed-workflow-orchestration-contracts";

export type ManagedWorkflowEventKind =
  | "stage_start_requested"
  | "core_validation_completed"
  | "provider_turn_completed"
  | "provider_turn_failed"
  | "user_message_received"
  | "recovery_tick";

export interface ManagedWorkflowEventBase {
  readonly eventId: string;
  readonly kind: ManagedWorkflowEventKind;
  readonly occurredAt: string;
  readonly stageId: ManagedWorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface ManagedWorkflowStageStartRequestedEvent
  extends ManagedWorkflowEventBase {
  readonly kind: "stage_start_requested";
  readonly providerId: string;
  readonly runSlug?: string | null;
}

export interface ManagedWorkflowCoreValidationCompletedEvent
  extends ManagedWorkflowEventBase {
  readonly kind: "core_validation_completed";
  readonly reasons: readonly string[];
  readonly result: "accepted" | "rejected";
}

export interface ManagedWorkflowProviderTurnCompletedEvent
  extends ManagedWorkflowEventBase {
  readonly kind: "provider_turn_completed";
  readonly providerId: string;
  readonly sessionId: string;
}

export interface ManagedWorkflowProviderTurnFailedEvent
  extends ManagedWorkflowEventBase {
  readonly errorMessage: string;
  readonly kind: "provider_turn_failed";
  readonly providerId: string;
  readonly recoverable: boolean;
}

export interface ManagedWorkflowUserMessageReceivedEvent
  extends ManagedWorkflowEventBase {
  readonly content: string;
  readonly intent: "accept" | "revision_request" | "unknown";
  readonly kind: "user_message_received";
}

export interface ManagedWorkflowRecoveryTickEvent
  extends ManagedWorkflowEventBase {
  readonly idleForMs: number;
  readonly kind: "recovery_tick";
}

export type ManagedWorkflowEvent =
  | ManagedWorkflowStageStartRequestedEvent
  | ManagedWorkflowCoreValidationCompletedEvent
  | ManagedWorkflowProviderTurnCompletedEvent
  | ManagedWorkflowProviderTurnFailedEvent
  | ManagedWorkflowUserMessageReceivedEvent
  | ManagedWorkflowRecoveryTickEvent;

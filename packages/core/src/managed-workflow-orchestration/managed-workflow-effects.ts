import type { ManagedWorkflowStageId } from "./managed-workflow-orchestration-contracts";
import type { ManagedWorkflowSnapshot } from "./managed-workflow-snapshot";

export type ManagedWorkflowEffectKind =
  | "append_core_message"
  | "dispatch_provider_prompt"
  | "persist_snapshot"
  | "record_audit_entry"
  | "request_commit"
  | "expose_read_model"
  | "stop_for_user";

export interface ManagedWorkflowEffectBase {
  readonly kind: ManagedWorkflowEffectKind;
  readonly stageId: ManagedWorkflowStageId;
}

export interface ManagedWorkflowAppendCoreMessageEffect
  extends ManagedWorkflowEffectBase {
  readonly kind: "append_core_message";
  readonly message: string;
  readonly visibleToProvider: boolean;
  readonly visibleToUser: boolean;
}

export interface ManagedWorkflowDispatchProviderPromptEffect
  extends ManagedWorkflowEffectBase {
  readonly kind: "dispatch_provider_prompt";
  readonly prompt: string;
  readonly providerId: string;
}

export interface ManagedWorkflowPersistSnapshotEffect
  extends ManagedWorkflowEffectBase {
  readonly kind: "persist_snapshot";
  readonly snapshot: ManagedWorkflowSnapshot;
}

export interface ManagedWorkflowRecordAuditEntryEffect
  extends ManagedWorkflowEffectBase {
  readonly detail: string;
  readonly kind: "record_audit_entry";
}

export interface ManagedWorkflowRequestCommitEffect
  extends ManagedWorkflowEffectBase {
  readonly allowedPaths: readonly string[];
  readonly expectedCommitMessage: string;
  readonly kind: "request_commit";
}

export interface ManagedWorkflowExposeReadModelEffect
  extends ManagedWorkflowEffectBase {
  readonly kind: "expose_read_model";
  readonly snapshot: ManagedWorkflowSnapshot;
}

export interface ManagedWorkflowStopForUserEffect
  extends ManagedWorkflowEffectBase {
  readonly kind: "stop_for_user";
  readonly reason: string;
}

export type ManagedWorkflowEffect =
  | ManagedWorkflowAppendCoreMessageEffect
  | ManagedWorkflowDispatchProviderPromptEffect
  | ManagedWorkflowPersistSnapshotEffect
  | ManagedWorkflowRecordAuditEntryEffect
  | ManagedWorkflowRequestCommitEffect
  | ManagedWorkflowExposeReadModelEffect
  | ManagedWorkflowStopForUserEffect;

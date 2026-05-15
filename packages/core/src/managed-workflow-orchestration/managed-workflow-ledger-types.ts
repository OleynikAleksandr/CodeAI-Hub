import type { ManagedWorkflowEffectKind } from "./managed-workflow-effects";
import type { ManagedWorkflowEventKind } from "./managed-workflow-events";
import type { ManagedWorkflowStageId } from "./managed-workflow-orchestration-contracts";
import type { ManagedWorkflowSnapshot } from "./managed-workflow-snapshot";

export type ManagedWorkflowLedgerRecordKind = "snapshot" | "event" | "effect";

export interface ManagedWorkflowLedgerRecord {
  readonly effectKind?: ManagedWorkflowEffectKind;
  readonly eventKind?: ManagedWorkflowEventKind;
  readonly kind: ManagedWorkflowLedgerRecordKind;
  readonly recordedAt: string;
  readonly recordId: string;
  readonly snapshot?: ManagedWorkflowSnapshot;
  readonly stageId: ManagedWorkflowStageId;
  readonly workspaceSlug: string;
}

export interface ManagedWorkflowLedgerLookup {
  readonly stageId: ManagedWorkflowStageId;
  readonly workspaceSlug: string;
}

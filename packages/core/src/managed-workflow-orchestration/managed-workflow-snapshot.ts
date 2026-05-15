import type {
  ManagedWorkflowPhaseType,
  ManagedWorkflowStageId,
} from "./managed-workflow-orchestration-contracts";

export type ManagedWorkflowRunStatus =
  | "idle"
  | "core_gated"
  | "waiting_for_provider"
  | "waiting_for_user"
  | "persistent_return_open"
  | "blocked"
  | "panic_stopped"
  | "preview_blocked";

export interface ManagedWorkflowBlockerSnapshot {
  readonly code: string;
  readonly detail: string;
  readonly owner: "core" | "provider" | "user";
}

export interface ManagedWorkflowPhaseSnapshot {
  readonly index: number;
  readonly title: string;
  readonly type: ManagedWorkflowPhaseType;
}

export interface ManagedWorkflowSnapshot {
  readonly accepted: boolean;
  readonly activeTaskId: string | null;
  readonly blocker: ManagedWorkflowBlockerSnapshot | null;
  readonly currentPhase: ManagedWorkflowPhaseSnapshot | null;
  readonly integrated: boolean;
  readonly lastCoreMessage: string | null;
  readonly materialized: boolean;
  readonly stageId: ManagedWorkflowStageId;
  readonly status: ManagedWorkflowRunStatus;
  readonly updatedAt: string;
  readonly version: 1;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export type ManagedWorkflowSnapshotPatch = Partial<
  Pick<
    ManagedWorkflowSnapshot,
    | "accepted"
    | "activeTaskId"
    | "blocker"
    | "currentPhase"
    | "integrated"
    | "lastCoreMessage"
    | "materialized"
    | "status"
  >
>;

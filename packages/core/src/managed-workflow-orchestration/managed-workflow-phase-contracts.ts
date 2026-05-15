import type { ManagedWorkflowPhaseType } from "./managed-workflow-orchestration-contracts";
import type {
  ManagedWorkflowPhaseSnapshot,
  ManagedWorkflowRunStatus,
} from "./managed-workflow-snapshot";

export interface ManagedWorkflowPhaseContract {
  readonly failureStatus: ManagedWorkflowRunStatus;
  readonly index: number;
  readonly successStatus: ManagedWorkflowRunStatus;
  readonly title: string;
  readonly type: ManagedWorkflowPhaseType;
}

export const createManagedWorkflowPhaseSnapshot = (
  phase: ManagedWorkflowPhaseContract
): ManagedWorkflowPhaseSnapshot => ({
  index: phase.index,
  title: phase.title,
  type: phase.type,
});

export const TYPE_A_CORE_GATED_PHASE: ManagedWorkflowPhaseContract = {
  failureStatus: "waiting_for_provider",
  index: 1,
  successStatus: "waiting_for_user",
  title: "Core-Gated Draft",
  type: "core_gated",
};

export const TYPE_B_USER_REVIEW_PHASE: ManagedWorkflowPhaseContract = {
  failureStatus: "waiting_for_provider",
  index: 2,
  successStatus: "waiting_for_provider",
  title: "User-Led Review",
  type: "user_led_review",
};

export const PERSISTENT_RETURN_PHASE: ManagedWorkflowPhaseContract = {
  failureStatus: "blocked",
  index: 3,
  successStatus: "persistent_return_open",
  title: "Persistent User Return",
  type: "persistent_user_return",
};

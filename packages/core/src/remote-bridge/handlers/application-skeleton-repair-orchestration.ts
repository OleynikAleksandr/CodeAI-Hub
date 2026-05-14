import type { Logger } from "../../telemetry/logger";
import type { ApplicationSkeletonGuardDecision } from "./application-skeleton-contract-guard";
import type { ApplicationSkeletonPhase } from "./application-skeleton-phase-state";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { ManagedGitStatus } from "./managed-git-stage-gate";

const APPLICATION_SKELETON_REPAIR_DISABLED_REASON =
  "Application Skeleton repair orchestration is disabled while the managed workflow orchestration cluster is being rewritten.";

export interface ApplicationSkeletonRepairOrchestrationResult {
  readonly evidencePath?: string;
  readonly injectedRepairTaskId?: string;
  readonly status: "evidence_written" | "injected" | "noop";
}

export const runApplicationSkeletonRepairOrchestration = (params: {
  readonly decision: ApplicationSkeletonGuardDecision;
  readonly logger: Logger;
  readonly managedGitStatus: ManagedGitStatus;
  readonly phase: ApplicationSkeletonPhase;
  readonly progress: ApplicationSkeletonProgressSnapshot | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ApplicationSkeletonRepairOrchestrationResult> => {
  params.logger.warn(APPLICATION_SKELETON_REPAIR_DISABLED_REASON, {
    workspaceSlug: params.workspaceSlug,
  });
  return Promise.resolve({ status: "noop" });
};

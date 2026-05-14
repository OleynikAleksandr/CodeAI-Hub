import type { Logger } from "../../telemetry/logger";
import type { ManagedGitStatus } from "./managed-git-stage-gate";
import type {
  QualityGatesGuardDecision,
  QualityGatesPhase,
} from "./quality-gates-contract-guard";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

const QUALITY_GATES_REPAIR_DISABLED_REASON =
  "Quality Gates repair orchestration is disabled while the managed workflow orchestration cluster is being rewritten.";

export interface QualityGatesRepairOrchestrationResult {
  readonly evidencePath?: string;
  readonly injectedRepairTaskId?: string;
  readonly status: "evidence_written" | "injected" | "noop";
}

export const runQualityGatesRepairOrchestration = (params: {
  readonly decision: QualityGatesGuardDecision;
  readonly logger: Logger;
  readonly managedGitStatus: ManagedGitStatus;
  readonly phase: QualityGatesPhase;
  readonly progress: QualityGatesProgressSnapshot | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<QualityGatesRepairOrchestrationResult> => {
  params.logger.warn(QUALITY_GATES_REPAIR_DISABLED_REASON, {
    workspaceSlug: params.workspaceSlug,
  });
  return Promise.resolve({ status: "noop" });
};

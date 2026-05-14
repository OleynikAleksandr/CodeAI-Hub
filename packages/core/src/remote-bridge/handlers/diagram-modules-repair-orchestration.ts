import type { Logger } from "../../telemetry/logger";
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import type { ManagedGitStatus } from "./managed-git-stage-gate";

const DIAGRAM_MODULES_REPAIR_DISABLED_REASON =
  "Diagram Modules repair orchestration is disabled while the managed workflow orchestration cluster is being rewritten.";

export interface DiagramModulesRepairOrchestrationResult {
  readonly evidencePath?: string;
  readonly injectedRepairTaskId?: string;
  readonly status: "evidence_written" | "injected" | "noop";
}

export const runDiagramModulesRepairOrchestration = (params: {
  readonly logger: Logger;
  readonly managedGitStatus: ManagedGitStatus;
  readonly progress: DiagramModulesProgressSnapshot | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<DiagramModulesRepairOrchestrationResult> => {
  params.logger.warn(DIAGRAM_MODULES_REPAIR_DISABLED_REASON, {
    workspaceSlug: params.workspaceSlug,
  });
  return Promise.resolve({ status: "noop" });
};

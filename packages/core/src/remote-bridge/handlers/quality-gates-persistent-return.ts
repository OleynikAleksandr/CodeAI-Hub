import type { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";

export const completeQualityGatesPersistentReturn = async (options: {
  readonly sessionId: string;
  readonly stagePlan: QualityGatesStagePlanController;
  readonly waitForMessagePersistence?: (sessionId: string) => Promise<void>;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  await options.waitForMessagePersistence?.(options.sessionId);
  await options.stagePlan.commitTerminalHandoffResidue({
    workspaceRoot: options.workspaceRoot,
    workspaceSlug: options.workspaceSlug,
  });
};

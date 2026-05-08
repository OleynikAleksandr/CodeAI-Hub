import type { Logger } from "../../telemetry/logger";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import { readApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import { readDiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import type { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";
import type { ManagedGitStatus } from "./managed-git-stage-gate";
import { readManagedGitStatus } from "./managed-git-stage-gate";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";
import { readQualityGatesProgressSnapshot } from "./quality-gates-progress";

export interface ManagedDocumentationProgressContext {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly diagramModulesProgress: DiagramModulesProgressSnapshot | null;
  readonly managedGitStatus: ManagedGitStatus;
  readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
}

const hasCommittableManagedStage = (
  context: ManagedDocumentationProgressContext
): boolean =>
  Boolean(
    (context.diagramModulesProgress?.aggregateReady &&
      context.managedGitStatus.dirtyByStage.diagram_modules.length > 0) ||
      (context.applicationSkeletonProgress?.materialized &&
        context.managedGitStatus.dirtyByStage.application_skeleton.length >
          0) ||
      (context.qualityGatesProgress?.integrated &&
        context.managedGitStatus.dirtyByStage.quality_gates.length > 0)
  );

export const commitManagedDocumentationStageIfReady = async (params: {
  readonly context: ManagedDocumentationProgressContext;
  readonly logger: Logger;
  readonly transaction: ManagedDocumentationCommitTransaction;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ManagedDocumentationProgressContext> => {
  if (!hasCommittableManagedStage(params.context)) {
    return params.context;
  }
  const commitResult = await params.transaction
    .commitAcceptedStage({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    })
    .catch((error) => {
      params.logger.warn("Managed documentation commit transaction failed", {
        error: error instanceof Error ? error.message : String(error),
        workspaceSlug: params.workspaceSlug,
      });
      return null;
    });
  if (commitResult?.status !== "committed") {
    return params.context;
  }
  const [
    diagramModulesProgress,
    applicationSkeletonProgress,
    qualityGatesProgress,
    managedGitStatus,
  ] = await Promise.all([
    readDiagramModulesProgressSnapshot(params),
    readApplicationSkeletonProgressSnapshot(params),
    readQualityGatesProgressSnapshot(params),
    readManagedGitStatus(params.workspaceRoot, params.workspaceSlug),
  ]);
  return {
    applicationSkeletonProgress,
    diagramModulesProgress,
    managedGitStatus,
    qualityGatesProgress,
  };
};

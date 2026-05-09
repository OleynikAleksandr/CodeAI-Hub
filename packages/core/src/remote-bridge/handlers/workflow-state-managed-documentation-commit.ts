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

const DIAGRAM_MODULES_PRODUCT_PART_FILE_RE =
  /\/diagram_modules\/product-parts\/([^/]+)\.md$/u;

export interface ManagedDocumentationProgressContext {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly diagramModulesProgress: DiagramModulesProgressSnapshot | null;
  readonly managedGitStatus: ManagedGitStatus;
  readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
}

const hasCommittableDiagramModulesStage = (
  context: ManagedDocumentationProgressContext
): boolean => {
  const dirtyFiles = context.managedGitStatus.dirtyByStage.diagram_modules;
  const progress = context.diagramModulesProgress;
  if (!progress || dirtyFiles.length === 0) {
    return false;
  }
  if (progress.aggregateReady) {
    return true;
  }
  if (
    dirtyFiles.some((file) =>
      file.endsWith("/diagram_modules/product-parts.index.md")
    )
  ) {
    return progress.plannedPartIds.length > 0;
  }
  return dirtyFiles.some((file) => {
    const partId = DIAGRAM_MODULES_PRODUCT_PART_FILE_RE.exec(file)?.[1];
    return Boolean(partId && progress.generatedPartIds.includes(partId));
  });
};

const hasCommittableManagedStage = (
  context: ManagedDocumentationProgressContext
): boolean =>
  Boolean(
    hasCommittableDiagramModulesStage(context) ||
      (context.applicationSkeletonProgress?.materialized &&
        context.managedGitStatus.dirtyByStage.application_skeleton.length >
          0) ||
      (context.qualityGatesProgress?.integrated &&
        context.managedGitStatus.dirtyByStage.quality_gates.length > 0)
  );

const readLatestManagedDocumentationProgress = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ManagedDocumentationProgressContext> => {
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

export const commitManagedDocumentationStageIfReady = async (params: {
  readonly context: ManagedDocumentationProgressContext;
  readonly logger: Logger;
  readonly transaction: ManagedDocumentationCommitTransaction;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ManagedDocumentationProgressContext> => {
  const latestContext = await readLatestManagedDocumentationProgress(params);
  if (!hasCommittableManagedStage(latestContext)) {
    return latestContext;
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
    return commitResult?.status === "blocked" && commitResult.stage
      ? attachOutOfOwnerDirtyFiles({
          context: latestContext,
          files: commitResult.unmanagedDirtyFiles,
          stage: commitResult.stage,
        })
      : latestContext;
  }
  return readLatestManagedDocumentationProgress(params);
};

const attachOutOfOwnerDirtyFiles = (params: {
  readonly context: ManagedDocumentationProgressContext;
  readonly files: readonly string[];
  readonly stage: "application_skeleton" | "diagram_modules" | "quality_gates";
}): ManagedDocumentationProgressContext => {
  if (params.files.length === 0) {
    return params.context;
  }
  const attach = <T extends object>(progress: T | null): T | null =>
    progress
      ? ({
          ...progress,
          managedGitOutOfOwnerDirtyFiles: params.files,
        } as T)
      : progress;
  return {
    ...params.context,
    applicationSkeletonProgress:
      params.stage === "application_skeleton"
        ? attach(params.context.applicationSkeletonProgress)
        : params.context.applicationSkeletonProgress,
    diagramModulesProgress:
      params.stage === "diagram_modules"
        ? attach(params.context.diagramModulesProgress)
        : params.context.diagramModulesProgress,
    qualityGatesProgress:
      params.stage === "quality_gates"
        ? attach(params.context.qualityGatesProgress)
        : params.context.qualityGatesProgress,
  };
};

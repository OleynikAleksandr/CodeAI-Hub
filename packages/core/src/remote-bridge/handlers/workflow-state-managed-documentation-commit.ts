import type { Logger } from "../../telemetry/logger";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import { readApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import { readDiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import type { ManagedGitStatus } from "./managed-git-stage-gate";
import { readManagedGitStatus } from "./managed-git-stage-gate";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";
import { readQualityGatesProgressSnapshot } from "./quality-gates-progress";

const MANAGED_DOCUMENTATION_COMMIT_DISABLED_REASON =
  "Managed documentation commit ownership is disabled while the managed workflow orchestration cluster is being rewritten.";

export interface ManagedDocumentationProgressContext {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly diagramModulesProgress: DiagramModulesProgressSnapshot | null;
  readonly managedGitStatus: ManagedGitStatus;
  readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
}

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
  readonly transaction: unknown;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ManagedDocumentationProgressContext> => {
  params.logger.warn(MANAGED_DOCUMENTATION_COMMIT_DISABLED_REASON, {
    workspaceSlug: params.workspaceSlug,
  });
  const latestContext = await readLatestManagedDocumentationProgress(params);
  return latestContext;
};

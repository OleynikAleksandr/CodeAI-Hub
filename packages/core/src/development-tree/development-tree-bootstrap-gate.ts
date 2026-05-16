import {
  type ApplicationSkeletonProgressSnapshot,
  readApplicationSkeletonProgressSnapshot,
} from "../remote-bridge/handlers/application-skeleton-progress";
import {
  type QualityGatesProgressSnapshot,
  readQualityGatesProgressSnapshot,
} from "../remote-bridge/handlers/quality-gates-progress";

export interface DevelopmentTreeStageReadinessSnapshot {
  readonly blockers: readonly string[];
  readonly ready: boolean;
}

const readyStage = (): DevelopmentTreeStageReadinessSnapshot => ({
  blockers: [],
  ready: true,
});

const blockedStage = (
  blocker: string
): DevelopmentTreeStageReadinessSnapshot => ({
  blockers: [blocker],
  ready: false,
});

const resolveApplicationSkeletonReadiness = (
  progress: ApplicationSkeletonProgressSnapshot | null
): DevelopmentTreeStageReadinessSnapshot => {
  if (!progress) {
    return blockedStage("Application Skeleton progress is missing");
  }
  if (!progress.foundationReady) {
    return {
      blockers:
        progress.validationErrors.length > 0
          ? progress.validationErrors
          : ["Application Skeleton project foundation is not ready"],
      ready: false,
    };
  }
  return progress.materialized
    ? readyStage()
    : blockedStage("Application Skeleton artifacts are not materialized");
};

const resolveQualityGatesReadiness = (
  progress: QualityGatesProgressSnapshot | null
): DevelopmentTreeStageReadinessSnapshot =>
  progress?.integrated
    ? readyStage()
    : blockedStage("Quality Gates artifacts are not integrated");

const isDevelopmentTreeUnlocked = (params: {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly applicationSkeletonReadiness: DevelopmentTreeStageReadinessSnapshot;
  readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
  readonly qualityGatesReadiness: DevelopmentTreeStageReadinessSnapshot;
}): boolean =>
  Boolean(
    params.applicationSkeletonProgress?.materialized &&
      params.applicationSkeletonReadiness.ready &&
      params.qualityGatesProgress?.integrated &&
      params.qualityGatesReadiness.ready
  );

export interface DevelopmentTreeBootstrapGateSnapshot {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly applicationSkeletonReadiness: DevelopmentTreeStageReadinessSnapshot;
  readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
  readonly qualityGatesReadiness: DevelopmentTreeStageReadinessSnapshot;
  readonly unlocked: boolean;
}

export const readDevelopmentTreeBootstrapGate = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<DevelopmentTreeBootstrapGateSnapshot> => {
  const [applicationSkeletonProgress, qualityGatesProgress] = await Promise.all(
    [
      readApplicationSkeletonProgressSnapshot(params),
      readQualityGatesProgressSnapshot(params),
    ]
  );
  const applicationSkeletonReadiness = resolveApplicationSkeletonReadiness(
    applicationSkeletonProgress
  );
  const qualityGatesReadiness =
    resolveQualityGatesReadiness(qualityGatesProgress);

  return {
    applicationSkeletonProgress,
    applicationSkeletonReadiness,
    qualityGatesProgress,
    qualityGatesReadiness,
    unlocked: isDevelopmentTreeUnlocked({
      applicationSkeletonProgress,
      applicationSkeletonReadiness,
      qualityGatesProgress,
      qualityGatesReadiness,
    }),
  };
};

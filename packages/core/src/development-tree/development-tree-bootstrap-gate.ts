import {
  type ApplicationSkeletonProgressSnapshot,
  readApplicationSkeletonProgressSnapshot,
} from "../remote-bridge/handlers/application-skeleton-progress";
import {
  type QualityGatesProgressSnapshot,
  readQualityGatesProgressSnapshot,
} from "../remote-bridge/handlers/quality-gates-progress";

export interface DevelopmentTreeBootstrapGateSnapshot {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
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

  return {
    applicationSkeletonProgress,
    qualityGatesProgress,
    unlocked: Boolean(
      applicationSkeletonProgress?.materialized &&
        qualityGatesProgress?.integrated
    ),
  };
};

const APPLICATION_SKELETON_REVISION_DISABLED_REASON =
  "Application Skeleton revision injection is disabled while the managed workflow orchestration cluster is being rewritten.";

export interface ApplicationSkeletonRevisionInjectionLogger {
  readonly info: (message: string, payload?: Record<string, unknown>) => void;
  readonly warn: (message: string, payload?: Record<string, unknown>) => void;
}

export interface ApplicationSkeletonRevisionInjectionRunnerInput {
  readonly logger: ApplicationSkeletonRevisionInjectionLogger;
  readonly sessionId: string;
  readonly stage: string;
  readonly workspaceRoot: string;
}

export const runApplicationSkeletonRevisionInjection = (
  params: ApplicationSkeletonRevisionInjectionRunnerInput
): Promise<void> => {
  params.logger.warn(APPLICATION_SKELETON_REVISION_DISABLED_REASON, {
    sessionId: params.sessionId,
    stage: params.stage,
  });
  return Promise.resolve();
};

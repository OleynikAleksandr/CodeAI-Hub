const QUALITY_GATES_REVISION_DISABLED_REASON =
  "Quality Gates revision injection is disabled while the managed workflow orchestration cluster is being rewritten.";

export interface QualityGatesRevisionInjectionLogger {
  readonly info: (message: string, payload?: Record<string, unknown>) => void;
  readonly warn: (message: string, payload?: Record<string, unknown>) => void;
}

export interface QualityGatesRevisionInjectionRunnerInput {
  readonly logger: QualityGatesRevisionInjectionLogger;
  readonly sessionId: string;
  readonly stage: string;
  readonly workspaceRoot: string;
}

export const runQualityGatesRevisionInjection = (
  params: QualityGatesRevisionInjectionRunnerInput
): Promise<void> => {
  params.logger.warn(QUALITY_GATES_REVISION_DISABLED_REASON, {
    sessionId: params.sessionId,
    stage: params.stage,
  });
  return Promise.resolve();
};

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { injectApplicationSkeletonTaskPair } from "../../managed-workspace/managed-application-skeleton-plan-mutator";

// Side-effecting runner around the pure
// `injectApplicationSkeletonReviewRevisionPair` helper. Reads the Application
// Skeleton stage plan, asks the helper to compute an injection, writes the
// result back, and reports the outcome through the supplied logger. Only the
// open-ended `phase2.review.task1` state triggers an injection.

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

export const runApplicationSkeletonRevisionInjection = async (
  params: ApplicationSkeletonRevisionInjectionRunnerInput
): Promise<void> => {
  const planPath = path.join(
    params.workspaceRoot,
    "doc/TODO/stages/application-skeleton/todo-plan.md"
  );
  const planText = await readFile(planPath, "utf8").catch(() => null);
  if (!planText?.includes('"application-skeleton.phase2.review.task1"')) {
    return;
  }
  const injection = injectApplicationSkeletonTaskPair({
    kind: "review_revision",
    planText,
  });
  if (!injection) {
    return;
  }
  await writeFile(planPath, injection.nextPlanText, "utf8")
    .then(() =>
      params.logger.info("Injected Application Skeleton review revision pair", {
        nextCommitMessage: injection.nextCommitMessage,
        nextCurrentTaskId: injection.nextCurrentTaskId,
        revisionNumber: injection.sequenceNumber,
        sessionId: params.sessionId,
        stage: params.stage,
      })
    )
    .catch((error: unknown) =>
      params.logger.warn("Failed to inject review revision pair", {
        error: error instanceof Error ? error.message : String(error),
        sessionId: params.sessionId,
        stage: params.stage,
      })
    );
};

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { injectApplicationSkeletonReviewRevisionPair } from "./managed-documentation-commit-transaction";

// Side-effecting runner around the pure
// `injectApplicationSkeletonReviewRevisionPair` helper. Reads the Application
// Skeleton stage plan, asks the helper to compute an injection, writes the
// result back, and reports the outcome through the supplied logger. Only the
// open-ended `phase1b.review.task1` state triggers an injection.

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
  if (!planText?.includes('"application-skeleton.phase1b.review.task1"')) {
    return;
  }
  const injection = injectApplicationSkeletonReviewRevisionPair(planText);
  if (!injection) {
    return;
  }
  await writeFile(planPath, injection.nextPlanText, "utf8")
    .then(() =>
      params.logger.info(
        "Injected Application Skeleton phase 1B revision pair",
        {
          nextCommitMessage: injection.nextCommitMessage,
          nextCurrentTaskId: injection.nextCurrentTaskId,
          revisionNumber: injection.nextRevisionNumber,
          sessionId: params.sessionId,
          stage: params.stage,
        }
      )
    )
    .catch((error: unknown) =>
      params.logger.warn("Failed to inject phase 1B revision pair", {
        error: error instanceof Error ? error.message : String(error),
        sessionId: params.sessionId,
        stage: params.stage,
      })
    );
};

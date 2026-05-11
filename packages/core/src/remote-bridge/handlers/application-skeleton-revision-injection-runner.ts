import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { injectApplicationSkeletonTaskPair } from "../../managed-workspace/managed-application-skeleton-plan-mutator";

// Side-effecting runner around the pure
// `injectApplicationSkeletonReviewRevisionPair` helper. Reads the Application
// Skeleton stage plan, asks the helper to compute an injection, writes the
// result back, and reports the outcome through the supplied logger. The
// open-ended Phase 2 review anchor and the post-completion Phase 4 user-return
// anchor both create concrete revision task pairs before Core commits changes.

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

const CURRENT_TASK_ID_RE = /"currentTaskId": "([^"]+)"/u;

const readCurrentTaskId = (planText: string): string | null => {
  const match = CURRENT_TASK_ID_RE.exec(planText);
  return match?.[1] ?? null;
};

const resolveInjectionKind = (
  currentTaskId: string | null
): "review_revision" | "user_return_revision" | null => {
  if (currentTaskId === "application-skeleton.phase2.review.task1") {
    return "review_revision";
  }
  if (currentTaskId === "application-skeleton.phase4.user-return.task1") {
    return "user_return_revision";
  }
  return null;
};

export const runApplicationSkeletonRevisionInjection = async (
  params: ApplicationSkeletonRevisionInjectionRunnerInput
): Promise<void> => {
  const planPath = path.join(
    params.workspaceRoot,
    "doc/TODO/stages/application-skeleton/todo-plan.md"
  );
  const planText = await readFile(planPath, "utf8").catch(() => null);
  if (!planText) {
    return;
  }
  const kind = resolveInjectionKind(readCurrentTaskId(planText));
  if (!kind) {
    return;
  }
  const injection = injectApplicationSkeletonTaskPair({
    kind,
    planText,
  });
  if (!injection) {
    return;
  }
  await writeFile(planPath, injection.nextPlanText, "utf8")
    .then(() =>
      params.logger.info("Injected Application Skeleton revision pair", {
        kind,
        nextCommitMessage: injection.nextCommitMessage,
        nextCurrentTaskId: injection.nextCurrentTaskId,
        revisionNumber: injection.sequenceNumber,
        sessionId: params.sessionId,
        stage: params.stage,
      })
    )
    .catch((error: unknown) =>
      params.logger.warn(
        "Failed to inject Application Skeleton revision pair",
        {
          error: error instanceof Error ? error.message : String(error),
          sessionId: params.sessionId,
          stage: params.stage,
        }
      )
    );
};

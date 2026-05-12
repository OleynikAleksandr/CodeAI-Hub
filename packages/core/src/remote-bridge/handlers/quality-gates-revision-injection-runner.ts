import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { injectQualityGatesTaskPair } from "../../managed-workspace/managed-quality-gates-plan-mutator";

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

const QUALITY_GATES_PLAN_PATH = "doc/TODO/stages/quality-gates/todo-plan.md";
const CURRENT_TASK_ID_RE = /"currentTaskId": "([^"]+)"/u;

const readCurrentTaskId = (planText: string): string | null => {
  const match = CURRENT_TASK_ID_RE.exec(planText);
  return match?.[1] ?? null;
};

const resolveInjectionKind = (
  currentTaskId: string | null
): "review_revision" | "user_return_revision" | null => {
  if (currentTaskId === "quality-gates.phase2.review.task1") {
    return "review_revision";
  }
  if (currentTaskId === "quality-gates.phase4.user-return.task1") {
    return "user_return_revision";
  }
  return null;
};

export const runQualityGatesRevisionInjection = async (
  params: QualityGatesRevisionInjectionRunnerInput
): Promise<void> => {
  const planPath = path.join(params.workspaceRoot, QUALITY_GATES_PLAN_PATH);
  const planText = await readFile(planPath, "utf8").catch(() => null);
  if (!planText) {
    return;
  }
  const kind = resolveInjectionKind(readCurrentTaskId(planText));
  if (!kind) {
    return;
  }
  const injection = injectQualityGatesTaskPair({
    kind,
    planText,
  });
  if (!injection) {
    return;
  }
  await writeFile(planPath, injection.nextPlanText, "utf8")
    .then(() =>
      params.logger.info("Injected Quality Gates revision pair", {
        kind,
        nextCommitMessage: injection.nextCommitMessage,
        nextCurrentTaskId: injection.nextCurrentTaskId,
        revisionNumber: injection.sequenceNumber,
        sessionId: params.sessionId,
        stage: params.stage,
      })
    )
    .catch((error: unknown) =>
      params.logger.warn("Failed to inject Quality Gates revision pair", {
        error: error instanceof Error ? error.message : String(error),
        sessionId: params.sessionId,
        stage: params.stage,
      })
    );
};

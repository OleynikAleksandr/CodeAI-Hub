import {
  buildQualityGatesDraftRepairPrompt,
  buildQualityGatesIntegrationRepairPrompt,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder";
import type { QualityGatesManagedValidationResult } from "../../managed-workflow-orchestration/quality-gates/quality-gates-validator";

const QUALITY_GATES_INTEGRATION_REPAIR_TASK_RE =
  /^quality-gates\.phase3\.repair\.task(\d+)$/u;

const resolveQualityGatesIntegrationRepairAttemptNumber = (
  taskId: string | null
): number => {
  const match = taskId?.match(QUALITY_GATES_INTEGRATION_REPAIR_TASK_RE);
  const value = Number(match?.[1]);
  return Number.isInteger(value) && value > 0 ? value : 1;
};

export const buildQualityGatesRepairDispatch = (
  params: {
    readonly workspaceSlug: string;
  },
  decision: QualityGatesManagedValidationResult,
  rejected: {
    readonly rejectedCommitHash: string;
    readonly repairTaskId: string | null;
  } | null
): { readonly notice: string; readonly prompt: string } => {
  const prompt =
    decision.nextAction === "repair_integration"
      ? buildQualityGatesIntegrationRepairPrompt({
          attemptNumber: resolveQualityGatesIntegrationRepairAttemptNumber(
            rejected?.repairTaskId ?? null
          ),
          diagnostics: decision.diagnostics,
          rejectedCommitHash: rejected?.rejectedCommitHash ?? null,
          workspaceSlug: params.workspaceSlug,
        })
      : (decision.nextPrompt ??
        buildQualityGatesDraftRepairPrompt({
          diagnostics: decision.diagnostics,
          workspaceSlug: params.workspaceSlug,
        }));
  return {
    prompt,
    notice: `Core: Quality Gates требует исправить ${decision.phase === "integration" ? "интеграцию" : "черновик"}.\nПолный repair prompt отправлен агенту внутренним сообщением.`,
  };
};

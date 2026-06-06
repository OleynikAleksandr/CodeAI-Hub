import {
  buildQualityGatesDraftRepairPrompt,
  buildQualityGatesIntegrationRepairPrompt,
  buildQualityGatesVerificationRepairPrompt,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder";
import type { QualityGatesManagedValidationResult } from "../../managed-workflow-orchestration/quality-gates/quality-gates-validator";

const QUALITY_GATES_REPAIR_TASK_RE =
  /^quality-gates\.phase[34]\.repair\.task(\d+)$/u;

const resolveQualityGatesRepairAttemptNumber = (
  taskId: string | null
): number => {
  const match = taskId?.match(QUALITY_GATES_REPAIR_TASK_RE);
  const value = Number(match?.[1]);
  return Number.isInteger(value) && value > 0 ? value : 1;
};

const buildQualityGatesIntegrationScopeRepairPrompt = (
  params: {
    readonly workspaceSlug: string;
  },
  decision: QualityGatesManagedValidationResult,
  rejected: {
    readonly rejectedCommitHash: string;
    readonly repairTaskId: string | null;
  } | null
): string => {
  const options = {
    attemptNumber: resolveQualityGatesRepairAttemptNumber(
      rejected?.repairTaskId ?? null
    ),
    diagnostics: decision.diagnostics,
    rejectedCommitHash: rejected?.rejectedCommitHash ?? null,
    workspaceSlug: params.workspaceSlug,
  };
  return decision.phase === "verification"
    ? buildQualityGatesVerificationRepairPrompt(options)
    : buildQualityGatesIntegrationRepairPrompt(options);
};

const describeRepairSubject = (
  phase: QualityGatesManagedValidationResult["phase"]
): string => {
  if (phase === "verification") {
    return "формальную проверку";
  }
  return phase === "integration" ? "интеграцию" : "черновик";
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
      ? buildQualityGatesIntegrationScopeRepairPrompt(
          params,
          decision,
          rejected
        )
      : (decision.nextPrompt ??
        buildQualityGatesDraftRepairPrompt({
          diagnostics: decision.diagnostics,
          workspaceSlug: params.workspaceSlug,
        }));
  return {
    prompt,
    notice: `Core: Quality Gates требует исправить ${describeRepairSubject(decision.phase)}.\nПолный repair prompt отправлен агенту внутренним сообщением.`,
  };
};

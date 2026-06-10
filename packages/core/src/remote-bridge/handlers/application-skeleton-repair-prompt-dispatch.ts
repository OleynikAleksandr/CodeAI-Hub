import {
  buildApplicationSkeletonDraftRepairPrompt,
  buildApplicationSkeletonMaterializationRepairPrompt,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder";
import type { ApplicationSkeletonManagedValidationResult } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-validator";

export const buildApplicationSkeletonRepairDispatch = (
  params: {
    readonly workspaceSlug: string;
  },
  decision: ApplicationSkeletonManagedValidationResult,
  rejected: {
    readonly rejectedCommitHash: string;
    readonly repairTaskId: string | null;
  } | null,
  attemptNumber: number
): { readonly notice: string; readonly prompt: string } => {
  const prompt =
    decision.nextAction === "repair_materialization"
      ? buildApplicationSkeletonMaterializationRepairPrompt({
          attemptNumber,
          diagnostics: decision.diagnostics,
          rejectedCommitHash: rejected?.rejectedCommitHash ?? null,
          workspaceSlug: params.workspaceSlug,
        })
      : (decision.nextPrompt ??
        buildApplicationSkeletonDraftRepairPrompt({
          diagnostics: decision.diagnostics,
          workspaceSlug: params.workspaceSlug,
        }));
  return {
    prompt,
    notice: [
      `Core: Application Skeleton требует исправить ${
        decision.phase === "materialization" ? "материализацию" : "черновик"
      }.`,
      "Полный repair prompt отправлен агенту внутренним сообщением.",
    ].join("\n"),
  };
};

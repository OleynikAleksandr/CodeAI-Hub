import {
  buildQualityGatesDraftRepairPrompt,
  buildQualityGatesResearchUserReviewMessage,
} from "./quality-gates-prompt-builder";
import { validateQualityGatesResearchArtifacts } from "./quality-gates-research-validator";
import {
  QUALITY_GATES_INITIAL_DRAFT_TASK_ID,
  readQualityGatesCurrentTaskId,
} from "./quality-gates-stage-plan-state-reader";
import type {
  QualityGatesManagedValidationRequest,
  QualityGatesManagedValidationResult,
} from "./quality-gates-validator";

export interface QualityGatesResearchFirstBoundaryResult {
  readonly decision: QualityGatesManagedValidationResult | null;
  readonly researchDiagnostics: readonly string[];
}

const buildDraftInvalidResult = (params: {
  readonly diagnostics: readonly string[];
  readonly workspaceSlug: string;
}): QualityGatesManagedValidationResult => ({
  contractJson: null,
  diagnostics: params.diagnostics,
  nextAction: "repair_current_artifact",
  nextPrompt: buildQualityGatesDraftRepairPrompt({
    diagnostics: params.diagnostics,
    workspaceSlug: params.workspaceSlug,
  }),
  phase: "draft",
  valid: false,
});

export const resolveQualityGatesResearchFirstBoundary = async (params: {
  readonly contractMarkdown: string | null;
  readonly contractJsonText: string | null;
  readonly request: QualityGatesManagedValidationRequest;
}): Promise<QualityGatesResearchFirstBoundaryResult> => {
  const researchDiagnostics = await validateQualityGatesResearchArtifacts(
    params.request
  );
  if (!(params.contractJsonText || params.contractMarkdown)) {
    return researchDiagnostics.length > 0
      ? {
          decision: buildDraftInvalidResult({
            diagnostics: researchDiagnostics,
            workspaceSlug: params.request.workspaceSlug,
          }),
          researchDiagnostics,
        }
      : {
          decision: {
            contractJson: null,
            diagnostics: [],
            nextAction: "open_user_review",
            nextPrompt: buildQualityGatesResearchUserReviewMessage(),
            phase: "draft",
            valid: true,
          },
          researchDiagnostics,
        };
  }
  const currentTaskId = await readQualityGatesCurrentTaskId(
    params.request.workspaceRoot
  );
  return currentTaskId === QUALITY_GATES_INITIAL_DRAFT_TASK_ID
    ? {
        decision: buildDraftInvalidResult({
          diagnostics: [
            ...researchDiagnostics,
            "quality_gates_contract_before_research_review",
          ],
          workspaceSlug: params.request.workspaceSlug,
        }),
        researchDiagnostics,
      }
    : { decision: null, researchDiagnostics };
};

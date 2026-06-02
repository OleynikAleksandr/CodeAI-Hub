import {
  resolvePreferredWorkflowLastActive,
  type WorkflowLastActiveSnapshot,
} from "../../workflow/state/workflow-last-active-store";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";

const DEFAULT_DESCRIPTION_ARTIFACT_PATH = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/description/questionnaire.md`;

const resolveDescriptionArtifactPath = (params: {
  readonly description: {
    readonly questionnairePath?: string;
    readonly finalPath?: string;
    readonly updatedAt?: string;
  } | null;
  readonly lastActive: WorkflowLastActiveSnapshot | null;
  readonly workspaceSlug: string;
}): string =>
  params.description?.finalPath ??
  params.description?.questionnairePath ??
  (params.lastActive?.stage === "description"
    ? params.lastActive.artifactPath
    : undefined) ??
  DEFAULT_DESCRIPTION_ARTIFACT_PATH(params.workspaceSlug);

const isWorkflowStageId = (value: string): value is WorkflowStageId =>
  value === "description" ||
  value === "virtual_simulation" ||
  value === "diagram_modules" ||
  value === "application_skeleton" ||
  value === "quality_gates";

const resolveContinuityLastActiveCandidates = (
  chains: readonly {
    readonly stage: string;
    readonly updatedAt: string;
    readonly segments: readonly unknown[];
  }[]
): readonly WorkflowLastActiveSnapshot[] =>
  chains.flatMap((chain) => {
    if (chain.segments.length === 0 || !isWorkflowStageId(chain.stage)) {
      return [];
    }
    return [{ stage: chain.stage, updatedAt: chain.updatedAt }];
  });

export const resolveCanonicalLastActive = (params: {
  readonly chains: readonly {
    readonly stage: string;
    readonly updatedAt: string;
    readonly segments: readonly unknown[];
  }[];
  readonly description: {
    readonly updatedAt?: string;
    readonly questionnairePath?: string;
    readonly finalPath?: string;
  } | null;
  readonly lastActive: WorkflowLastActiveSnapshot | null;
  readonly state: WorkflowState;
  readonly workspaceSlug: string;
}): WorkflowLastActiveSnapshot | null => {
  const descriptionCandidate: WorkflowLastActiveSnapshot = {
    stage: "description",
    updatedAt:
      params.description?.updatedAt ??
      params.lastActive?.updatedAt ??
      params.state.updatedAt,
    artifactPath: resolveDescriptionArtifactPath({
      description: params.description,
      lastActive: params.lastActive,
      workspaceSlug: params.workspaceSlug,
    }),
  };
  return resolvePreferredWorkflowLastActive([
    params.lastActive,
    descriptionCandidate,
    ...resolveContinuityLastActiveCandidates(params.chains),
  ]);
};

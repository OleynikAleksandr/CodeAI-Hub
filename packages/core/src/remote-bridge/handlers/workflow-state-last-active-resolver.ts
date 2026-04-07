import type { WorkflowLastActiveSnapshot } from "../../workflow/state/workflow-last-active-store";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";

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
  return {
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
};

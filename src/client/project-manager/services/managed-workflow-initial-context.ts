import {
  isRecord,
  joinUrl,
  resolveCoreHttpUrl,
} from "./description-questionnaire-utils";

type ManagedStageId =
  | "application_skeleton"
  | "diagram_modules"
  | "quality_gates";

type WorkflowStageId = "description" | "virtual_simulation" | ManagedStageId;

const isManagedStage = (stage: WorkflowStageId): stage is ManagedStageId =>
  stage === "diagram_modules" ||
  stage === "application_skeleton" ||
  stage === "quality_gates";

const MANAGED_CONTEXT_BUNDLE_ENDPOINT =
  "/api/v1/orchestrator/managed-context-bundle";

export const buildManagedWorkflowInitialContext = async (params: {
  readonly providerId?: string;
  readonly stage: WorkflowStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<string | null> => {
  if (!isManagedStage(params.stage)) {
    return null;
  }
  const httpUrl = resolveCoreHttpUrl();
  if (!httpUrl) {
    return null;
  }
  const query = new URLSearchParams({
    stage: params.stage,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
    providerId: params.providerId ?? "unknown",
  });
  try {
    const response = await fetch(
      joinUrl(httpUrl, `${MANAGED_CONTEXT_BUNDLE_ENDPOINT}?${query.toString()}`)
    );
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    if (!isRecord(payload)) {
      return null;
    }
    const content = payload.content;
    return typeof content === "string" && content.length > 0 ? content : null;
  } catch {
    return null;
  }
};

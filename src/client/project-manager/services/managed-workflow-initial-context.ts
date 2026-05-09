import {
  isRecord,
  joinUrl,
  resolveCoreHttpUrl,
} from "./description-questionnaire-utils";

type ManagedStageId =
  | "application_skeleton"
  | "diagram_modules"
  | "quality_gates";

type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | ManagedStageId;

const WORKFLOW_SOURCE_MAX_BYTES = 500_000;
const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const WORKSPACE_PLAN_STATE_START = "<!-- codeai-workspace-plan-state:start -->";
const WORKSPACE_PLAN_STATE_END = "<!-- codeai-workspace-plan-state:end -->";
const ACTIVE_PLAN_STATE_START = "<!-- codeai-plan-state:start -->";
const ACTIVE_PLAN_STATE_END = "<!-- codeai-plan-state:end -->";

const DEFAULT_STAGE_PLAN_PATHS: Record<ManagedStageId, string> = {
  application_skeleton: "doc/TODO/stages/application-skeleton/todo-plan.md",
  diagram_modules: "doc/TODO/stages/diagram-modules/todo-plan.md",
  quality_gates: "doc/TODO/stages/quality-gates/todo-plan.md",
};

const isManagedStage = (stage: WorkflowStageId): stage is ManagedStageId =>
  stage === "diagram_modules" ||
  stage === "application_skeleton" ||
  stage === "quality_gates";

const parseJsonBlock = (
  text: string | null,
  start: string,
  end: string
): Readonly<Record<string, unknown>> => {
  const block = text?.split(start)[1]?.split(end)[0];
  if (!block) {
    return {};
  }
  const json = block
    .trim()
    .replace(/^```json\s*/u, "")
    .replace(/\s*```$/u, "")
    .trim();
  try {
    const parsed: unknown = JSON.parse(json);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const readString = (
  value: unknown
): string | null => (typeof value === "string" ? value : null);

const readArtifactText = async (params: {
  readonly relativePath: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<string | null> => {
  const httpUrl = resolveCoreHttpUrl();
  if (!httpUrl) {
    return null;
  }
  const query = new URLSearchParams({
    maxBytes: String(WORKFLOW_SOURCE_MAX_BYTES),
    path: params.relativePath,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  const response = await fetch(
    joinUrl(httpUrl, `/api/v1/orchestrator/workflow-artifact?${query.toString()}`)
  );
  if (!response.ok) {
    return null;
  }
  const payload: unknown = await response.json();
  return isRecord(payload) ? readString(payload.content) : null;
};

const renderTextBlock = (title: string, text: string | null): string =>
  [`## ${title}`, "```markdown", text?.trim() || "(not available)", "```"].join(
    "\n"
  );

export const buildManagedWorkflowInitialContext = async (params: {
  readonly providerId?: string;
  readonly stage: WorkflowStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<string | null> => {
  if (!isManagedStage(params.stage)) {
    return null;
  }
  const workspacePlanText = await readArtifactText({
    relativePath: WORKSPACE_PLAN_PATH,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  const workspaceState = parseJsonBlock(
    workspacePlanText,
    WORKSPACE_PLAN_STATE_START,
    WORKSPACE_PLAN_STATE_END
  );
  const activePlanPath =
    readString(workspaceState.activePlanPath) ??
    DEFAULT_STAGE_PLAN_PATHS[params.stage];
  const activePlanText = await readArtifactText({
    relativePath: activePlanPath,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  const activeState = parseJsonBlock(
    activePlanText,
    ACTIVE_PLAN_STATE_START,
    ACTIVE_PLAN_STATE_END
  );
  return [
    "## Managed Workflow Context Bundle",
    "Core embedded the current managed-workflow context below. Do not reread plan files or run plan status commands from the provider turn.",
    `Stage: ${params.stage}`,
    `Current provider: ${params.providerId ?? "unknown"}`,
    renderTextBlock("Workspace Plan Text", workspacePlanText),
    renderTextBlock("Active Stage Todo Plan Text", activePlanText),
    "## Plan Status",
    `activeStage: ${JSON.stringify(readString(workspaceState.activeStage) ?? null)}`,
    `activePlanPath: ${JSON.stringify(activePlanPath)}`,
    `Execution scope status: ${readString(activeState.executionScopeStatus) ?? "unknown"}`,
    `Current task: ${readString(activeState.currentTaskId) ?? "none"}`,
    `Expected commit: ${readString(activeState.expectedCommitMessage) ?? "none"}`,
    `Last recorded commit: ${readString(activeState.lastRecordedCommit) ?? "none"}`,
  ].join("\n\n");
};

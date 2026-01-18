const WORKFLOW_STATE_ENDPOINT = "/api/v1/orchestrator/workflow-state";

export type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "diagram_facades";

export type WorkflowStageStatus =
  | "idle"
  | "in_progress"
  | "completed"
  | "invalid";

export type WorkflowStateSnapshot = {
  readonly workspaceSlug: string;
  readonly updatedAt: string;
  readonly stages: Record<WorkflowStageId, WorkflowStageStatus>;
};

type WorkflowStateResponse = {
  readonly state: unknown;
};

const STAGE_ORDER: readonly WorkflowStageId[] = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "diagram_facades",
];

const DEFAULT_STAGE_STATUS: WorkflowStageStatus = "idle";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isWorkflowStageStatus = (value: unknown): value is WorkflowStageStatus =>
  value === "idle" ||
  value === "in_progress" ||
  value === "completed" ||
  value === "invalid";

const buildDefaultStages = (): Record<WorkflowStageId, WorkflowStageStatus> =>
  STAGE_ORDER.reduce<Record<WorkflowStageId, WorkflowStageStatus>>(
    (accumulator, stage) => {
      accumulator[stage] = DEFAULT_STAGE_STATUS;
      return accumulator;
    },
    {} as Record<WorkflowStageId, WorkflowStageStatus>
  );

const parseWorkflowState = (
  payload: unknown
): WorkflowStateSnapshot | null => {
  const response = isRecord(payload) ? (payload as WorkflowStateResponse) : null;
  const state = response && "state" in response ? response.state : payload;
  if (!isRecord(state)) {
    return null;
  }
  const workspaceSlug = readNonEmptyString(state.workspaceSlug);
  if (!workspaceSlug) {
    return null;
  }
  const updatedAt = readNonEmptyString(state.updatedAt) ?? new Date().toISOString();
  const stagesPayload = state.stages;
  const stages = buildDefaultStages();

  if (isRecord(stagesPayload)) {
    for (const stage of STAGE_ORDER) {
      const stageState = stagesPayload[stage];
      if (!isRecord(stageState)) {
        continue;
      }
      const status = stageState.status;
      if (isWorkflowStageStatus(status)) {
        stages[stage] = status;
      }
    }
  }

  return { workspaceSlug, updatedAt, stages };
};

const joinUrl = (baseUrl: string, path: string): string =>
  baseUrl.endsWith("/") ? `${baseUrl.slice(0, -1)}${path}` : `${baseUrl}${path}`;

export const fetchWorkflowState = async (params: {
  readonly httpUrl: string;
  readonly workspaceSlug: string;
}): Promise<WorkflowStateSnapshot | null> => {
  try {
    const response = await fetch(
      joinUrl(
        params.httpUrl,
        `${WORKFLOW_STATE_ENDPOINT}?workspaceSlug=${encodeURIComponent(
          params.workspaceSlug
        )}`
      ),
      { method: "GET" }
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as unknown;
    const parsed = parseWorkflowState(payload);
    if (!parsed) {
      return null;
    }
    return parsed.workspaceSlug === params.workspaceSlug ? parsed : null;
  } catch {
    return null;
  }
};

export const toWorkflowWorkspaceSlug = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return slug.length > 0 ? slug : "workspace";
};

export const WORKFLOW_STAGE_ORDER = STAGE_ORDER;

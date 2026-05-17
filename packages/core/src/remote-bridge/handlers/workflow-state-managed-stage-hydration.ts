import { readFile } from "node:fs/promises";
import path from "node:path";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";

const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const WORKSPACE_START = "<!-- codeai-workspace-plan-state:start -->";
const WORKSPACE_END = "<!-- codeai-workspace-plan-state:end -->";
const FENCED_JSON_START_RE = /^```json\s*/u;
const FENCED_JSON_END_RE = /\s*```$/u;
const TECHNICAL_STAGES = [
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];

const readCompletedStages = async (
  workspaceRoot: string
): Promise<ReadonlySet<string>> => {
  const content = await readFile(
    path.join(workspaceRoot, WORKSPACE_PLAN_PATH),
    "utf8"
  ).catch(() => null);
  const rawBlock = content?.split(WORKSPACE_START)[1]?.split(WORKSPACE_END)[0];
  const json = rawBlock
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    return new Set();
  }
  try {
    const parsed = JSON.parse(json) as { readonly completedStages?: unknown };
    return new Set(
      Array.isArray(parsed.completedStages)
        ? parsed.completedStages.filter(
            (stage): stage is string => typeof stage === "string"
          )
        : []
    );
  } catch {
    return new Set();
  }
};

export const hydrateTechnicalStageCompletionFromManagedWorkspace =
  async (params: {
    readonly state: WorkflowState;
    readonly workspaceRoot: string;
  }): Promise<WorkflowState> => {
    const completedStages = await readCompletedStages(params.workspaceRoot);
    let nextStages = params.state.stages;

    for (const stage of TECHNICAL_STAGES) {
      const stageState = nextStages[stage];
      const completed = completedStages.has(stage);
      let nextStatus = stageState.status;
      if (completed) {
        nextStatus = "completed";
      } else if (stageState.status === "completed") {
        nextStatus = "in_progress";
      }
      if (nextStatus === stageState.status) {
        continue;
      }
      nextStages = {
        ...nextStages,
        [stage]: { ...stageState, status: nextStatus },
      };
    }

    return nextStages === params.state.stages
      ? params.state
      : { ...params.state, stages: nextStages };
  };

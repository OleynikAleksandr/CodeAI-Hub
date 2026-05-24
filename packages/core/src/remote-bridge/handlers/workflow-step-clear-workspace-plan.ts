import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";

const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const WORKSPACE_START = "<!-- codeai-workspace-plan-state:start -->";
const WORKSPACE_END = "<!-- codeai-workspace-plan-state:end -->";
const FENCED_JSON_START_RE = /^```json\s*/u;
const FENCED_JSON_END_RE = /\s*```$/u;
const WORKFLOW_STAGES = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];
const MANAGED_STAGES = [
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];
const STAGE_PLAN_PATHS: Record<(typeof MANAGED_STAGES)[number], string> = {
  application_skeleton: "doc/TODO/stages/application-skeleton/todo-plan.md",
  diagram_modules: "doc/TODO/stages/diagram-modules/todo-plan.md",
  quality_gates: "doc/TODO/stages/quality-gates/todo-plan.md",
};

interface ManagedWorkspaceState {
  readonly acceptedCommits?: unknown[];
  readonly activePlanPath?: unknown;
  readonly activeStage?: unknown;
  readonly completedStages?: unknown[];
  readonly lastAcceptedCommitHash?: unknown;
  readonly lastAcceptedCommitMessage?: unknown;
  readonly unlockedStages?: unknown[];
  readonly [key: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseWorkspaceState = (content: string): ManagedWorkspaceState | null => {
  const rawBlock = content.split(WORKSPACE_START)[1]?.split(WORKSPACE_END)[0];
  const json = rawBlock
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    return null;
  }
  try {
    return JSON.parse(json) as ManagedWorkspaceState;
  } catch {
    return null;
  }
};

const replaceWorkspaceState = (
  content: string,
  state: ManagedWorkspaceState
): string =>
  content.replace(
    new RegExp(`${WORKSPACE_START}[\\s\\S]*?${WORKSPACE_END}`, "u"),
    `${WORKSPACE_START}\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n${WORKSPACE_END}`
  );

const downstreamStages = (
  stage: WorkflowStageId
): readonly WorkflowStageId[] => {
  const index = WORKFLOW_STAGES.indexOf(stage);
  return index < 0 ? [] : WORKFLOW_STAGES.slice(index);
};

const managedDownstreamStages = (
  stage: WorkflowStageId
): readonly (typeof MANAGED_STAGES)[number][] =>
  downstreamStages(stage).filter((candidate) =>
    MANAGED_STAGES.includes(candidate as (typeof MANAGED_STAGES)[number])
  ) as readonly (typeof MANAGED_STAGES)[number][];

const pruneStageList = (
  values: readonly unknown[] | undefined,
  removedStages: ReadonlySet<string>
): unknown[] =>
  (Array.isArray(values) ? values : []).filter(
    (value) => typeof value !== "string" || !removedStages.has(value)
  );

const addUnique = <TValue>(
  values: readonly unknown[],
  value: TValue
): unknown[] => (values.includes(value) ? [...values] : [...values, value]);

const pruneAcceptedCommits = (
  values: readonly unknown[] | undefined,
  removedStages: ReadonlySet<string>
): unknown[] =>
  (Array.isArray(values) ? values : []).filter(
    (value) =>
      !(isRecord(value) && removedStages.has(String(value.stage ?? "")))
  );

const latestAcceptedCommit = (
  values: readonly unknown[]
): Record<string, unknown> | null => {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (isRecord(value)) {
      return value;
    }
  }
  return null;
};

export const resetManagedWorkspacePlanAfterWorkflowClear = async (params: {
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
}): Promise<boolean> => {
  const affectedStages = managedDownstreamStages(params.stage);
  if (affectedStages.length === 0) {
    return false;
  }
  const workspacePlanPath = path.join(
    params.workspaceRoot,
    WORKSPACE_PLAN_PATH
  );
  const workspacePlan = await readFile(workspacePlanPath, "utf8").catch(
    () => null
  );
  if (!workspacePlan) {
    return false;
  }
  const workspaceState = parseWorkspaceState(workspacePlan);
  if (!workspaceState) {
    return false;
  }
  const removedStages = new Set<string>(affectedStages);
  const firstManagedStage = affectedStages[0];
  const acceptedCommits = pruneAcceptedCommits(
    workspaceState.acceptedCommits,
    removedStages
  );
  const latestCommit = latestAcceptedCommit(acceptedCommits);
  const unlockedStages = addUnique(
    pruneStageList(workspaceState.unlockedStages, removedStages),
    firstManagedStage
  );
  const nextState: ManagedWorkspaceState = {
    ...workspaceState,
    acceptedCommits,
    activePlanPath: STAGE_PLAN_PATHS[firstManagedStage],
    activeStage: firstManagedStage,
    completedStages: pruneStageList(
      workspaceState.completedStages,
      removedStages
    ),
    lastAcceptedCommitHash: latestCommit?.hash ?? null,
    lastAcceptedCommitMessage: latestCommit?.message ?? null,
    unlockedStages,
  };
  await mkdir(path.dirname(workspacePlanPath), { recursive: true });
  await writeFile(
    workspacePlanPath,
    replaceWorkspaceState(workspacePlan, nextState),
    "utf8"
  );
  return true;
};

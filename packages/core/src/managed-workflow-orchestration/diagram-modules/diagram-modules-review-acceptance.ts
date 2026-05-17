import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureManagedTerminalGitClean } from "../managed-terminal-clean-git-boundary";
import { DiagramModulesManagedGitBoundary } from "./diagram-modules-managed-git-boundary";
import { commitManagedWorkflowLedger } from "./managed-workflow-ledger-git-boundary";

const PLAN_START = "<!-- codeai-plan-state:start -->";
const PLAN_END = "<!-- codeai-plan-state:end -->";
const WORKSPACE_START = "<!-- codeai-workspace-plan-state:start -->";
const WORKSPACE_END = "<!-- codeai-workspace-plan-state:end -->";
const DIAGRAM_STAGE_PLAN_PATH = "doc/TODO/stages/diagram-modules/todo-plan.md";
const APPLICATION_STAGE_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const REVIEW_TASK_PREFIX = "diagram-modules.phase2.review.";
const REVIEW_COMMIT_MESSAGE = "docs: open diagram modules user review";
const PHASE3_TASK_ID = "diagram-modules.phase3.user-return.task1";
const NO_REVISION_DISPOSITION =
  "not-created-user-accepted-without-review-revision";
const PERSISTENT_RETURN_DISPOSITION = "not-created-persistent-user-return-open";
const FENCED_JSON_START_RE = /^```json\s*/u;
const FENCED_JSON_END_RE = /\s*```$/u;

interface ManagedPlanState {
  currentTaskId: string | null;
  expectedCommitMessage: string | null;
  [key: string]: unknown;
}

interface ManagedWorkspaceState {
  completedStages?: unknown[];
  unlockedStages?: unknown[];
  [key: string]: unknown;
}

const readText = async (
  workspaceRoot: string,
  relativePath: string
): Promise<string> => readFile(path.join(workspaceRoot, relativePath), "utf8");

const writeText = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseStateBlock = <TState>(
  content: string,
  startMarker: string,
  endMarker: string
): TState => {
  const rawBlock = content.split(startMarker)[1]?.split(endMarker)[0];
  const json = rawBlock
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    throw new Error(`Missing managed state block: ${startMarker}`);
  }
  return JSON.parse(json) as TState;
};

const replaceStateBlock = (
  content: string,
  startMarker: string,
  endMarker: string,
  state: unknown
): string =>
  content.replace(
    new RegExp(
      `${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`,
      "u"
    ),
    `${startMarker}\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n${endMarker}`
  );

const addUnique = (
  values: readonly unknown[] | undefined,
  value: string
): unknown[] => {
  const existing = Array.isArray(values) ? values : [];
  return existing.includes(value) ? [...existing] : [...existing, value];
};

const maxListNumber = (content: string): number => {
  let max = 0;
  for (const match of content.matchAll(/^(\d+)\.\s+\[/gmu)) {
    max = Math.max(max, Number(match[1]));
  }
  return max;
};

const markReviewAccepted = (params: {
  readonly content: string;
  readonly taskId: string;
}): string => {
  const taskPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|IN_PROGRESS|BLOCKED|DONE)(\\] \`${escapeRegExp(
      params.taskId
    )}\` .*)$`,
    "mu"
  );
  const commitPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|PENDING|IN_PROGRESS|BLOCKED|DONE)(\\] Git Commit: \`${escapeRegExp(
      REVIEW_COMMIT_MESSAGE
    )}\` \\(hash: )(TBD|[^)]+)(\\))$`,
    "mu"
  );
  return params.content
    .replace(taskPattern, "$1DONE$2")
    .replace(commitPattern, (_match, start, middle, hash, end) => {
      const nextHash = hash === "TBD" ? NO_REVISION_DISPOSITION : hash;
      return `${start}DONE${middle}${nextHash}${end}`;
    });
};

const appendPersistentReturnStep = (content: string): string => {
  if (content.includes(`\`${PHASE3_TASK_ID}\``)) {
    return content;
  }
  const nextNumber = maxListNumber(content) + 1;
  return [
    content.trimEnd(),
    "",
    "## Phase 3 — Persistent Diagram Modules User Return",
    "",
    "### Stream: User Return And Revisions",
    "",
    `${nextNumber}. [IN_PROGRESS] \`${PHASE3_TASK_ID}\` Persistent Diagram Modules return phase is open for future user revisions after accepted user review (scope: user workflow; expected commit: none).`,
    `${nextNumber + 1}. [DONE] Git Commit: \`${PERSISTENT_RETURN_DISPOSITION}\` (hash: ${PERSISTENT_RETURN_DISPOSITION})`,
    "",
  ].join("\n");
};

const updateWorkspacePlan = async (workspaceRoot: string): Promise<void> => {
  const workspacePlanText = await readText(workspaceRoot, WORKSPACE_PLAN_PATH);
  const workspaceState = parseStateBlock<ManagedWorkspaceState>(
    workspacePlanText,
    WORKSPACE_START,
    WORKSPACE_END
  );
  const nextWorkspaceState: ManagedWorkspaceState = {
    ...workspaceState,
    activePlanPath: APPLICATION_STAGE_PLAN_PATH,
    activeStage: "application_skeleton",
    completedStages: addUnique(
      workspaceState.completedStages,
      "diagram_modules"
    ),
    unlockedStages: addUnique(
      addUnique(workspaceState.unlockedStages, "diagram_modules"),
      "application_skeleton"
    ),
  };
  await writeText(
    workspaceRoot,
    WORKSPACE_PLAN_PATH,
    replaceStateBlock(
      workspacePlanText,
      WORKSPACE_START,
      WORKSPACE_END,
      nextWorkspaceState
    )
  );
};

export const isDiagramModulesReviewOpen = async (
  workspaceRoot: string
): Promise<boolean> => {
  const planText = await readText(workspaceRoot, DIAGRAM_STAGE_PLAN_PATH).catch(
    () => null
  );
  if (!planText) {
    return false;
  }
  const state = parseStateBlock<ManagedPlanState>(
    planText,
    PLAN_START,
    PLAN_END
  );
  return state.currentTaskId?.startsWith(REVIEW_TASK_PREFIX) ?? false;
};

export const acceptDiagramModulesReviewWithoutRevision = async (params: {
  readonly gitBoundary?: DiagramModulesManagedGitBoundary;
  readonly workspaceRoot: string;
}): Promise<void> => {
  const gitBoundary =
    params.gitBoundary ?? new DiagramModulesManagedGitBoundary();
  const stagePlanText = await readText(
    params.workspaceRoot,
    DIAGRAM_STAGE_PLAN_PATH
  );
  const stageState = parseStateBlock<ManagedPlanState>(
    stagePlanText,
    PLAN_START,
    PLAN_END
  );
  if (!stageState.currentTaskId?.startsWith(REVIEW_TASK_PREFIX)) {
    throw new Error("Diagram Modules stage plan is not in review.");
  }
  await ensureManagedTerminalGitClean({
    gitBoundary,
    stage: "diagram_modules",
    workspaceRoot: params.workspaceRoot,
  });
  const nextStageState: ManagedPlanState = {
    ...stageState,
    currentTaskId: PHASE3_TASK_ID,
    expectedCommitMessage: null,
  };
  const nextStagePlan = appendPersistentReturnStep(
    markReviewAccepted({
      content: stagePlanText,
      taskId: stageState.currentTaskId,
    })
  );
  await writeText(
    params.workspaceRoot,
    DIAGRAM_STAGE_PLAN_PATH,
    replaceStateBlock(nextStagePlan, PLAN_START, PLAN_END, nextStageState)
  );
  await updateWorkspacePlan(params.workspaceRoot);
  await commitManagedWorkflowLedger({
    gitBoundary,
    ledgerPaths: [WORKSPACE_PLAN_PATH, DIAGRAM_STAGE_PLAN_PATH],
    workspaceRoot: params.workspaceRoot,
  });
};

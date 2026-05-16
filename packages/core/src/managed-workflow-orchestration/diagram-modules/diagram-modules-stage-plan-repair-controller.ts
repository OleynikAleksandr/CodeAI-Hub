import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DiagramModulesManagedGitBoundary } from "./diagram-modules-managed-git-boundary";
import type {
  DiagramModulesStagePlanAdvanceResult,
  NextPlanStep,
} from "./diagram-modules-stage-plan-controller";
import {
  appendDiagramModulesRepairStep,
  parseDiagramModulesRepairTaskNumber,
  resolveNextAfterRejectedCommit,
} from "./diagram-modules-stage-plan-repair-model";
import type { DiagramModulesManagedValidationResult } from "./diagram-modules-validator";

const PLAN_START = "<!-- codeai-plan-state:start -->";
const PLAN_END = "<!-- codeai-plan-state:end -->";
const DIAGRAM_STAGE_PLAN_PATH = "doc/TODO/stages/diagram-modules/todo-plan.md";
const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const FENCED_JSON_START_RE = /^```json\s*/u;
const FENCED_JSON_END_RE = /\s*```$/u;

interface ManagedPlanState {
  currentTaskId: string | null;
  expectedCommitMessage: string | null;
  lastRecordedCommit: string | null;
  [key: string]: unknown;
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const fileExists = async (
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> =>
  (
    await stat(path.join(workspaceRoot, relativePath)).catch(() => null)
  )?.isFile() ?? false;

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
): string => {
  const blockPattern = new RegExp(
    `${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`,
    "u"
  );
  return content.replace(
    blockPattern,
    `${startMarker}\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n${endMarker}`
  );
};

const updateStagePlanAfterRejectedCommit = (params: {
  readonly content: string;
  readonly currentTaskId: string;
  readonly expectedCommitMessage: string;
  readonly hash: string;
  readonly next: NextPlanStep;
  readonly workspaceSlug: string;
}): string => {
  const taskPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|IN_PROGRESS|BLOCKED)(\\] \`${escapeRegExp(
      params.currentTaskId
    )}\` .*)$`,
    "mu"
  );
  const commitPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|PENDING|IN_PROGRESS|BLOCKED)(\\] Git Commit: \`${escapeRegExp(
      params.expectedCommitMessage
    )}\` \\(hash: )(?:TBD|[^)]+)(\\))$`,
    "mu"
  );
  const markedDone = params.content
    .replace(taskPattern, "$1DONE$2")
    .replace(commitPattern, `$1DONE$2${params.hash}$3`);
  const attemptNumber = params.next.taskId
    ? parseDiagramModulesRepairTaskNumber(params.next.taskId)
    : null;
  return attemptNumber === null
    ? markedDone
    : appendDiagramModulesRepairStep({
        attemptNumber,
        content: markedDone,
        workspaceSlug: params.workspaceSlug,
      });
};

const productPartPath = (workspaceSlug: string, partId: string): string =>
  `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/${partId}.md`;

const collectRejectedManagedPaths = async (params: {
  readonly decision: DiagramModulesManagedValidationResult;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const paths = new Set<string>([
    WORKSPACE_PLAN_PATH,
    DIAGRAM_STAGE_PLAN_PATH,
    `.codeai-hub/${params.workspaceSlug}/workflow/managed/diagram_modules.json`,
    `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`,
  ]);
  for (const partId of params.decision.generatedPartIds) {
    paths.add(productPartPath(params.workspaceSlug, partId));
  }
  if (params.decision.currentPartId) {
    paths.add(
      productPartPath(params.workspaceSlug, params.decision.currentPartId)
    );
  }
  const existing: string[] = [];
  for (const relativePath of paths) {
    if (await fileExists(params.workspaceRoot, relativePath)) {
      existing.push(relativePath);
    }
  }
  return existing;
};

const block = (
  message: string,
  reason: "commit_failed" | "invalid_decision" | "plan_mismatch"
): DiagramModulesStagePlanAdvanceResult => ({
  blocked: { message, reason },
  commit: null,
});

export const commitDiagramModulesRejectedTurn = async (params: {
  readonly decision: DiagramModulesManagedValidationResult;
  readonly gitBoundary?: DiagramModulesManagedGitBoundary;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<DiagramModulesStagePlanAdvanceResult> => {
  if (params.decision.valid) {
    return block(
      "Diagram Modules validation did not reject the current managed artifact.",
      "invalid_decision"
    );
  }
  const stagePlanText = await readText(
    params.workspaceRoot,
    DIAGRAM_STAGE_PLAN_PATH
  );
  const stageState = parseStateBlock<ManagedPlanState>(
    stagePlanText,
    PLAN_START,
    PLAN_END
  );
  if (!(stageState.currentTaskId && stageState.expectedCommitMessage)) {
    return block(
      "Diagram Modules stage plan does not point to an active commit-backed microtask.",
      "plan_mismatch"
    );
  }
  const gitBoundary =
    params.gitBoundary ?? new DiagramModulesManagedGitBoundary();
  const managedPaths = await collectRejectedManagedPaths(params);
  try {
    const gitCommit = await gitBoundary.commitManagedChanges({
      commitMessage: stageState.expectedCommitMessage,
      managedPaths,
      workspaceRoot: params.workspaceRoot,
    });
    if (gitCommit.noStagedChanges || !gitCommit.hash) {
      return block(
        `No staged managed changes for commit "${stageState.expectedCommitMessage}".`,
        "commit_failed"
      );
    }
    const next = resolveNextAfterRejectedCommit(stagePlanText);
    const nextStageState: ManagedPlanState = {
      ...stageState,
      currentTaskId: next.taskId,
      expectedCommitMessage: next.expectedCommitMessage,
      lastRecordedCommit: gitCommit.hash,
    };
    const nextStagePlanText = replaceStateBlock(
      updateStagePlanAfterRejectedCommit({
        content: stagePlanText,
        currentTaskId: stageState.currentTaskId,
        expectedCommitMessage: stageState.expectedCommitMessage,
        hash: gitCommit.hash,
        next,
        workspaceSlug: params.workspaceSlug,
      }),
      PLAN_START,
      PLAN_END,
      nextStageState
    );
    await writeText(
      params.workspaceRoot,
      DIAGRAM_STAGE_PLAN_PATH,
      nextStagePlanText
    );
    return {
      blocked: null,
      commit: {
        expectedCommitMessage: stageState.expectedCommitMessage,
        hash: gitCommit.hash,
        nextTaskId: next.taskId,
      },
    };
  } catch (error) {
    return block(
      error instanceof Error
        ? error.message
        : `Managed commit failed: ${String(error)}`,
      "commit_failed"
    );
  }
};

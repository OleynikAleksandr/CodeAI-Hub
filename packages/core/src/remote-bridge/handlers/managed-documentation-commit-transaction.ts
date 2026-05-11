import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  isManagedStageId,
  listDirtyFilesOutsideManagedStage,
  type ManagedStageId,
  readManagedGitStatus,
} from "./managed-git-stage-gate";

const execFileAsync = promisify(execFile);
const ACTIVE_PLAN_STATE_END = "<!-- codeai-plan-state:end -->";
const ACTIVE_PLAN_STATE_START = "<!-- codeai-plan-state:start -->";
const DIAGRAM_MODULES_PRODUCT_PART_TASK_RE =
  /^diagram-modules\.product-part\.([a-z0-9]+(?:-[a-z0-9]+)*)$/u;
const DIAGRAM_MODULES_PLAN_PATH =
  "doc/TODO/stages/diagram-modules/todo-plan.md";
const JSON_FENCE_END_RE = /\s*```$/u;
const JSON_FENCE_START_RE = /^```json\s*/u;
const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const WORKSPACE_PLAN_STATE_END = "<!-- codeai-workspace-plan-state:end -->";
const WORKSPACE_PLAN_STATE_START = "<!-- codeai-workspace-plan-state:start -->";
const APPLICATION_SKELETON_REVIEW_TASK_LINE_RE =
  /^(\d+)\.\s*\[\w+\]\s*`application-skeleton\.phase2\.review\.task1`/mu;
const APPLICATION_SKELETON_REVISION_TASK_RE =
  /`application-skeleton\.phase2\.review\.revision(\d+)\.task1`/gu;
const ACTIVE_PLAN_STATE_BLOCK_RE =
  /<!-- codeai-plan-state:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- codeai-plan-state:end -->/u;

export interface ApplicationSkeletonReviewRevisionInjection {
  readonly nextCommitMessage: string;
  readonly nextCurrentTaskId: string;
  readonly nextPlanText: string;
  readonly nextRevisionNumber: number;
}

// Inject a `phase2.review.revisionN.task1` + `Git Commit` pair right above the
// open-ended `phase2.review.task1` line in an Application Skeleton stage plan,
// and rewrite the JSON state block to point at the new revision task. Returns
// `null` when the review task line or the JSON state block is missing —
// callers must keep the original plan text in that case.
export const injectApplicationSkeletonReviewRevisionPair = (
  planText: string
): ApplicationSkeletonReviewRevisionInjection | null => {
  const reviewMatch = APPLICATION_SKELETON_REVIEW_TASK_LINE_RE.exec(planText);
  if (!reviewMatch) {
    return null;
  }
  let lastRevision = 0;
  for (const match of planText.matchAll(
    APPLICATION_SKELETON_REVISION_TASK_RE
  )) {
    const candidate = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(candidate) && candidate > lastRevision) {
      lastRevision = candidate;
    }
  }
  const nextRevisionNumber = lastRevision + 1;
  const nextCurrentTaskId = `application-skeleton.phase2.review.revision${nextRevisionNumber}.task1`;
  const nextCommitMessage = `docs: revise application skeleton contract — revision ${nextRevisionNumber}`;
  const startNumber = reviewMatch[1] ?? "1";
  const newPair = [
    `${startNumber}. [IN_PROGRESS] \`${nextCurrentTaskId}\` User-led Phase 2 revision ${nextRevisionNumber} of the Application Skeleton contract artifacts; structurally validate and commit before returning to the open-ended review (scope: \`.codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json\`; expected commit: \`${nextCommitMessage}\`).`,
    `${startNumber}. [TODO] Git Commit: \`${nextCommitMessage}\` (hash: TBD)`,
    "",
  ].join("\n");
  const reviewLineStart = reviewMatch.index;
  const planWithInjection = `${planText.slice(0, reviewLineStart)}${newPair}${planText.slice(reviewLineStart)}`;
  const stateBlockMatch = ACTIVE_PLAN_STATE_BLOCK_RE.exec(planWithInjection);
  if (!stateBlockMatch) {
    return null;
  }
  let state: Record<string, unknown>;
  try {
    state = JSON.parse(stateBlockMatch[1] ?? "{}") as Record<string, unknown>;
  } catch {
    return null;
  }
  state.currentTaskId = nextCurrentTaskId;
  state.expectedCommitMessage = nextCommitMessage;
  const renderedState = `<!-- codeai-plan-state:start -->\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n<!-- codeai-plan-state:end -->`;
  const nextPlanText = planWithInjection.replace(
    stateBlockMatch[0],
    renderedState
  );
  return {
    nextCommitMessage,
    nextCurrentTaskId,
    nextPlanText,
    nextRevisionNumber,
  };
};

type ManagedDocumentationCommitTransactionStatus =
  | "blocked"
  | "committed"
  | "no_changes";

export interface ManagedDocumentationCommitTransactionResult {
  readonly activePlanPath?: string;
  readonly blockedReason?: string;
  readonly commitHash?: string;
  readonly dirtyFiles: readonly string[];
  readonly ownedFiles: readonly string[];
  readonly stage?: ManagedStageId;
  readonly status: ManagedDocumentationCommitTransactionStatus;
  readonly unmanagedDirtyFiles: readonly string[];
}

interface ManagedWorkspacePlanState {
  readonly activePlanPath: string;
  readonly activeStage: ManagedStageId;
}

interface ManagedActivePlanState {
  readonly currentTaskId: string;
  readonly expectedCommitMessage: string;
}

export class ManagedDocumentationCommitTransaction {
  async commitAcceptedStage(params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ManagedDocumentationCommitTransactionResult> {
    const workspacePlan = await readWorkspacePlanState(params.workspaceRoot);
    if (!workspacePlan) {
      return blocked("Missing or invalid managed workspace plan state.", []);
    }

    const status = await readManagedGitStatus(
      params.workspaceRoot,
      params.workspaceSlug
    );
    const ownedFiles = status.dirtyByStage[workspacePlan.activeStage];
    if (status.clean) {
      return {
        activePlanPath: workspacePlan.activePlanPath,
        dirtyFiles: status.dirtyFiles,
        ownedFiles,
        stage: workspacePlan.activeStage,
        status: "no_changes",
        unmanagedDirtyFiles: [],
      };
    }

    const unmanagedDirtyFiles = listDirtyFilesOutsideManagedStage(
      status,
      workspacePlan.activeStage
    );
    if (unmanagedDirtyFiles.length > 0) {
      return {
        activePlanPath: workspacePlan.activePlanPath,
        blockedReason:
          "Managed documentation commit blocked by files outside the active stage allowlist.",
        dirtyFiles: status.dirtyFiles,
        ownedFiles,
        stage: workspacePlan.activeStage,
        status: "blocked",
        unmanagedDirtyFiles,
      };
    }

    const activePlan = await readActivePlanState(
      params.workspaceRoot,
      workspacePlan.activePlanPath
    );
    if (!activePlan) {
      return {
        activePlanPath: workspacePlan.activePlanPath,
        blockedReason: "Missing active managed plan expected commit message.",
        dirtyFiles: status.dirtyFiles,
        ownedFiles,
        stage: workspacePlan.activeStage,
        status: "blocked",
        unmanagedDirtyFiles: [],
      };
    }

    const targetOwnedFiles = filterOwnedFilesForActivePlan({
      activePlan,
      ownedFiles,
      stage: workspacePlan.activeStage,
    });
    const outOfTargetOwnedFiles = ownedFiles.filter(
      (file) => !targetOwnedFiles.includes(file)
    );
    if (targetOwnedFiles.length === 0) {
      return {
        activePlanPath: workspacePlan.activePlanPath,
        dirtyFiles: status.dirtyFiles,
        ownedFiles: targetOwnedFiles,
        stage: workspacePlan.activeStage,
        status: "no_changes",
        unmanagedDirtyFiles: outOfTargetOwnedFiles,
      };
    }
    if (outOfTargetOwnedFiles.length > 0) {
      return {
        activePlanPath: workspacePlan.activePlanPath,
        blockedReason:
          "Managed documentation commit blocked by files outside the active microtask target.",
        dirtyFiles: status.dirtyFiles,
        ownedFiles: targetOwnedFiles,
        stage: workspacePlan.activeStage,
        status: "blocked",
        unmanagedDirtyFiles: outOfTargetOwnedFiles,
      };
    }

    await git(params.workspaceRoot, ["add", "--", ...targetOwnedFiles]);
    const stagedFiles = await listStagedFiles(params.workspaceRoot);
    const stagedOutsideAllowlist = stagedFiles.filter(
      (file) => !targetOwnedFiles.includes(file)
    );
    if (stagedOutsideAllowlist.length > 0) {
      return {
        activePlanPath: workspacePlan.activePlanPath,
        blockedReason:
          "Managed documentation commit blocked by staged files outside the active stage allowlist.",
        dirtyFiles: status.dirtyFiles,
        ownedFiles: targetOwnedFiles,
        stage: workspacePlan.activeStage,
        status: "blocked",
        unmanagedDirtyFiles: stagedOutsideAllowlist,
      };
    }

    await execFileAsync(
      "npm",
      ["run", "plan:commit", "--", activePlan.expectedCommitMessage],
      { cwd: params.workspaceRoot }
    );
    const postCommitStatus = await readManagedGitStatus(
      params.workspaceRoot,
      params.workspaceSlug
    );
    if (!postCommitStatus.clean) {
      return {
        activePlanPath: workspacePlan.activePlanPath,
        blockedReason:
          "Managed documentation commit completed but Git status is still dirty.",
        dirtyFiles: postCommitStatus.dirtyFiles,
        ownedFiles: targetOwnedFiles,
        stage: workspacePlan.activeStage,
        status: "blocked",
        unmanagedDirtyFiles: postCommitStatus.dirtyFiles,
      };
    }

    const commitHash = await git(params.workspaceRoot, [
      "rev-parse",
      "--short",
      "HEAD",
    ]);
    return {
      activePlanPath: workspacePlan.activePlanPath,
      commitHash,
      dirtyFiles: status.dirtyFiles,
      ownedFiles: targetOwnedFiles,
      stage: workspacePlan.activeStage,
      status: "committed",
      unmanagedDirtyFiles: [],
    };
  }
}

const blocked = (
  blockedReason: string,
  dirtyFiles: readonly string[]
): ManagedDocumentationCommitTransactionResult => ({
  blockedReason,
  dirtyFiles,
  ownedFiles: [],
  status: "blocked",
  unmanagedDirtyFiles: dirtyFiles,
});

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

type StageScopeFilter = (params: {
  readonly activePlan: ManagedActivePlanState;
  readonly ownedFiles: readonly string[];
}) => readonly string[];

const filterDiagramModulesForActivePlan: StageScopeFilter = ({
  activePlan,
  ownedFiles,
}) => {
  const workflowFiles = ownedFiles.filter((file) =>
    file.includes("/workflow/")
  );
  const childPlanFiles = ownedFiles.filter(
    (file) => file === DIAGRAM_MODULES_PLAN_PATH
  );
  if (
    activePlan.currentTaskId === "diagram-modules.stream1.task1" ||
    activePlan.expectedCommitMessage.includes("product part index")
  ) {
    return [
      ...ownedFiles.filter((file) =>
        file.endsWith("/diagram_modules/product-parts.index.md")
      ),
      ...workflowFiles,
      ...childPlanFiles,
    ];
  }
  const partId = DIAGRAM_MODULES_PRODUCT_PART_TASK_RE.exec(
    activePlan.currentTaskId
  )?.[1];
  return partId
    ? [
        ...ownedFiles.filter((file) =>
          file.endsWith("/diagram_modules/product-parts.index.md")
        ),
        ...ownedFiles.filter((file) =>
          file.endsWith(`/diagram_modules/product-parts/${partId}.md`)
        ),
        ...workflowFiles,
        ...childPlanFiles,
      ]
    : ownedFiles;
};

const passthroughOwnedFilesFilter: StageScopeFilter = ({ ownedFiles }) =>
  ownedFiles;

const STAGE_SCOPE_FILTERS: Record<ManagedStageId, StageScopeFilter> = {
  application_skeleton: passthroughOwnedFilesFilter,
  diagram_modules: filterDiagramModulesForActivePlan,
  quality_gates: passthroughOwnedFilesFilter,
};

const filterOwnedFilesForActivePlan = (params: {
  readonly activePlan: ManagedActivePlanState;
  readonly ownedFiles: readonly string[];
  readonly stage: ManagedStageId;
}): readonly string[] =>
  STAGE_SCOPE_FILTERS[params.stage]({
    activePlan: params.activePlan,
    ownedFiles: params.ownedFiles,
  });

const listStagedFiles = async (
  workspaceRoot: string
): Promise<readonly string[]> => {
  const stdout = await git(workspaceRoot, ["diff", "--cached", "--name-only"]);
  return stdout
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const readWorkspacePlanState = async (
  workspaceRoot: string
): Promise<ManagedWorkspacePlanState | null> => {
  const text = await readText(path.join(workspaceRoot, WORKSPACE_PLAN_PATH));
  if (!text) {
    return null;
  }
  const state = parseJsonBlock(text, {
    end: WORKSPACE_PLAN_STATE_END,
    start: WORKSPACE_PLAN_STATE_START,
  });
  const activeStage =
    typeof state?.activeStage === "string" &&
    isManagedStageId(state.activeStage)
      ? state.activeStage
      : null;
  return activeStage && typeof state?.activePlanPath === "string"
    ? { activePlanPath: state.activePlanPath, activeStage }
    : null;
};

const readActivePlanState = async (
  workspaceRoot: string,
  activePlanPath: string
): Promise<ManagedActivePlanState | null> => {
  const text = await readText(path.join(workspaceRoot, activePlanPath));
  if (!text) {
    return null;
  }
  const state = parseJsonBlock(text, {
    end: ACTIVE_PLAN_STATE_END,
    start: ACTIVE_PLAN_STATE_START,
  });
  return typeof state?.currentTaskId === "string" &&
    typeof state?.expectedCommitMessage === "string" &&
    state.expectedCommitMessage.trim()
    ? {
        currentTaskId: state.currentTaskId.trim(),
        expectedCommitMessage: state.expectedCommitMessage.trim(),
      }
    : null;
};

const readText = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
};

const parseJsonBlock = (
  text: string,
  markers: { readonly end: string; readonly start: string }
): Record<string, unknown> | null => {
  const raw = text.split(markers.start)[1]?.split(markers.end)[0];
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(stripJsonFence(raw)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const stripJsonFence = (value: string): string =>
  value
    .trim()
    .replace(JSON_FENCE_START_RE, "")
    .replace(JSON_FENCE_END_RE, "")
    .trim();

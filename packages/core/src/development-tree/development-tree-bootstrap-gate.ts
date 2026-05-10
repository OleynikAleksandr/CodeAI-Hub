import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  type ApplicationSkeletonProgressSnapshot,
  readApplicationSkeletonProgressSnapshot,
} from "../remote-bridge/handlers/application-skeleton-progress";
import {
  type QualityGatesProgressSnapshot,
  readQualityGatesProgressSnapshot,
} from "../remote-bridge/handlers/quality-gates-progress";

const execFileAsync = promisify(execFile);
const APPLICATION_SKELETON_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
const APPLICATION_SKELETON_MATERIALIZATION_TASK =
  "application-skeleton.phase2.materialize.task1";
const WORKSPACE_PLAN_PATH = path.join("doc", "TODO", "workspace.plan.md");
const QUALITY_GATES_PLAN_PATH = "doc/TODO/stages/quality-gates/todo-plan.md";
const QUALITY_GATES_INTEGRATION_TASK = "quality-gates.stream1.task2";
const WORKSPACE_STATE_START = "<!-- codeai-workspace-plan-state:start -->";
const WORKSPACE_STATE_END = "<!-- codeai-workspace-plan-state:end -->";
const PLAN_STATE_START = "<!-- codeai-plan-state:start -->";
const PLAN_STATE_END = "<!-- codeai-plan-state:end -->";
const JSON_FENCE_END_RE = /\s*```$/u;
const JSON_FENCE_START_RE = /^```(?:json)?\s*/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const stripJsonFence = (value: string): string =>
  value
    .trim()
    .replace(JSON_FENCE_START_RE, "")
    .replace(JSON_FENCE_END_RE, "")
    .trim();

const parseStateBlock = (
  content: string,
  startMarker: string,
  endMarker: string
): Record<string, unknown> | null => {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      stripJsonFence(content.slice(start + startMarker.length, end))
    ) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readStateFile = async (params: {
  readonly endMarker: string;
  readonly filePath: string;
  readonly startMarker: string;
}): Promise<Record<string, unknown> | null> => {
  try {
    return parseStateBlock(
      await readFile(params.filePath, "utf8"),
      params.startMarker,
      params.endMarker
    );
  } catch {
    return null;
  }
};

const hasAcceptedStageCommit = (
  workspaceState: Record<string, unknown> | null,
  params: {
    readonly message: string;
    readonly planPath: string;
    readonly stage: string;
    readonly taskId: string;
  }
): boolean => {
  const commits = workspaceState?.acceptedCommits;
  if (!Array.isArray(commits)) {
    return false;
  }
  return commits.some(
    (commit) =>
      isRecord(commit) &&
      commit.message === params.message &&
      commit.planPath === params.planPath &&
      commit.stage === params.stage &&
      commit.taskId === params.taskId &&
      Boolean(readNonEmptyString(commit.commitHash))
  );
};

const hasAdvancedStagePlan = (
  blockedTaskId: string,
  planState: Record<string, unknown> | null
): boolean =>
  !planState?.debt &&
  readNonEmptyString(planState?.currentTaskId) !== blockedTaskId;

const readGitClean = async (workspaceRoot: string): Promise<boolean> => {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--short"], {
      cwd: workspaceRoot,
    });
    return stdout.trim().length === 0;
  } catch {
    return false;
  }
};

export interface QualityGatesTransactionSnapshot {
  readonly blockers: readonly string[];
  readonly ready: boolean;
}

const readManagedStageTransaction = async (params: {
  readonly blockedTaskId: string;
  readonly commitMessage: string;
  readonly missingCommitBlocker: string;
  readonly planNotAdvancedBlocker: string;
  readonly planPath: string;
  readonly stage: string;
  readonly taskId: string;
  readonly workspaceRoot: string;
}): Promise<QualityGatesTransactionSnapshot> => {
  const workspacePlanPath = path.join(
    params.workspaceRoot,
    WORKSPACE_PLAN_PATH
  );
  const stagePlanPath = path.join(params.workspaceRoot, params.planPath);
  const [workspaceState, planState, gitClean] = await Promise.all([
    readStateFile({
      filePath: workspacePlanPath,
      startMarker: WORKSPACE_STATE_START,
      endMarker: WORKSPACE_STATE_END,
    }),
    readStateFile({
      filePath: stagePlanPath,
      startMarker: PLAN_STATE_START,
      endMarker: PLAN_STATE_END,
    }),
    readGitClean(params.workspaceRoot),
  ]);
  const blockers = [
    ...(hasAcceptedStageCommit(workspaceState, {
      message: params.commitMessage,
      planPath: params.planPath,
      stage: params.stage,
      taskId: params.taskId,
    })
      ? []
      : [params.missingCommitBlocker]),
    ...(hasAdvancedStagePlan(params.blockedTaskId, planState)
      ? []
      : [params.planNotAdvancedBlocker]),
    ...(gitClean ? [] : ["Managed workspace Git status is not clean"]),
  ];
  return { blockers, ready: blockers.length === 0 };
};

export interface DevelopmentTreeBootstrapGateSnapshot {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly applicationSkeletonTransaction: QualityGatesTransactionSnapshot;
  readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
  readonly qualityGatesTransaction: QualityGatesTransactionSnapshot;
  readonly unlocked: boolean;
}

export const readDevelopmentTreeBootstrapGate = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<DevelopmentTreeBootstrapGateSnapshot> => {
  const [applicationSkeletonProgress, qualityGatesProgress] = await Promise.all(
    [
      readApplicationSkeletonProgressSnapshot(params),
      readQualityGatesProgressSnapshot(params),
    ]
  );
  const applicationSkeletonTransaction =
    applicationSkeletonProgress?.materialized
      ? await readManagedStageTransaction({
          blockedTaskId: APPLICATION_SKELETON_MATERIALIZATION_TASK,
          commitMessage: "feat: materialize application skeleton",
          missingCommitBlocker:
            "Missing accepted application_skeleton materialization commit in workspace.plan.md",
          planNotAdvancedBlocker:
            "Application Skeleton child plan has not advanced past the materialization task",
          planPath: APPLICATION_SKELETON_PLAN_PATH,
          stage: "application_skeleton",
          taskId: APPLICATION_SKELETON_MATERIALIZATION_TASK,
          workspaceRoot: params.workspaceRoot,
        })
      : {
          blockers: ["Application Skeleton artifacts are not materialized"],
          ready: false,
        };
  const qualityGatesTransaction = qualityGatesProgress?.integrated
    ? await readManagedStageTransaction({
        blockedTaskId: QUALITY_GATES_INTEGRATION_TASK,
        commitMessage: "feat: integrate quality gates baseline",
        missingCommitBlocker:
          "Missing accepted quality_gates integration commit in workspace.plan.md",
        planNotAdvancedBlocker:
          "Quality Gates child plan has not advanced past the integration task",
        planPath: QUALITY_GATES_PLAN_PATH,
        stage: "quality_gates",
        taskId: QUALITY_GATES_INTEGRATION_TASK,
        workspaceRoot: params.workspaceRoot,
      })
    : {
        blockers: ["Quality Gates artifacts are not integrated"],
        ready: false,
      };

  return {
    applicationSkeletonProgress,
    applicationSkeletonTransaction,
    qualityGatesTransaction,
    qualityGatesProgress,
    unlocked: Boolean(
      applicationSkeletonProgress?.materialized &&
        applicationSkeletonTransaction.ready &&
        qualityGatesProgress?.integrated &&
        qualityGatesTransaction.ready
    ),
  };
};

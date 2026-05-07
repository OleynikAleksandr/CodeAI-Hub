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
const WORKSPACE_PLAN_PATH = path.join("doc", "TODO", "workspace.plan.md");
const QUALITY_GATES_PLAN_PATH = "doc/TODO/stages/quality-gates/todo-plan.md";
const QUALITY_GATES_INITIAL_TASK = "quality-gates.stream1.task1";
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

const hasAcceptedQualityGatesCommit = (
  workspaceState: Record<string, unknown> | null
): boolean => {
  const commits = workspaceState?.acceptedCommits;
  if (!Array.isArray(commits)) {
    return false;
  }
  return commits.some(
    (commit) =>
      isRecord(commit) &&
      commit.stage === "quality_gates" &&
      commit.planPath === QUALITY_GATES_PLAN_PATH &&
      Boolean(readNonEmptyString(commit.commitHash))
  );
};

const hasAdvancedQualityGatesPlan = (
  planState: Record<string, unknown> | null
): boolean =>
  !planState?.debt &&
  readNonEmptyString(planState?.currentTaskId) !== QUALITY_GATES_INITIAL_TASK;

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

const readQualityGatesTransaction = async (params: {
  readonly workspaceRoot: string;
}): Promise<QualityGatesTransactionSnapshot> => {
  const workspacePlanPath = path.join(
    params.workspaceRoot,
    WORKSPACE_PLAN_PATH
  );
  const qualityGatesPlanPath = path.join(
    params.workspaceRoot,
    QUALITY_GATES_PLAN_PATH
  );
  const [workspaceState, planState, gitClean] = await Promise.all([
    readStateFile({
      filePath: workspacePlanPath,
      startMarker: WORKSPACE_STATE_START,
      endMarker: WORKSPACE_STATE_END,
    }),
    readStateFile({
      filePath: qualityGatesPlanPath,
      startMarker: PLAN_STATE_START,
      endMarker: PLAN_STATE_END,
    }),
    readGitClean(params.workspaceRoot),
  ]);
  const blockers = [
    ...(hasAcceptedQualityGatesCommit(workspaceState)
      ? []
      : ["Missing accepted quality_gates commit in workspace.plan.md"]),
    ...(hasAdvancedQualityGatesPlan(planState)
      ? []
      : [
          "Quality Gates child plan has not advanced past the integration task",
        ]),
    ...(gitClean ? [] : ["Managed workspace Git status is not clean"]),
  ];
  return { blockers, ready: blockers.length === 0 };
};

export interface DevelopmentTreeBootstrapGateSnapshot {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
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
  const qualityGatesTransaction = qualityGatesProgress?.integrated
    ? await readQualityGatesTransaction(params)
    : {
        blockers: ["Quality Gates artifacts are not integrated"],
        ready: false,
      };

  return {
    applicationSkeletonProgress,
    qualityGatesTransaction,
    qualityGatesProgress,
    unlocked: Boolean(
      applicationSkeletonProgress?.materialized &&
        qualityGatesProgress?.integrated &&
        qualityGatesTransaction.ready
    ),
  };
};

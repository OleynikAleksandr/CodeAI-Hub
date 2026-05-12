import { readFile } from "node:fs/promises";
import path from "node:path";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";

const WORKSPACE_PLAN_PATH = path.join("doc", "TODO", "workspace.plan.md");
const WORKSPACE_STATE_START = "<!-- codeai-workspace-plan-state:start -->";
const WORKSPACE_STATE_END = "<!-- codeai-workspace-plan-state:end -->";
const APPLICATION_SKELETON_TERMINAL_COMMIT =
  "feat: materialize application skeleton";
const QUALITY_GATES_TERMINAL_COMMIT = "feat: integrate quality gates baseline";
const JSON_FENCE_START_RE = /^```json\s*/u;
const JSON_FENCE_END_RE = /\s*```$/u;

const readWorkspaceAcceptedCommits = async (
  workspaceRoot: string
): Promise<readonly Record<string, unknown>[]> => {
  const planPath = path.join(workspaceRoot, WORKSPACE_PLAN_PATH);
  let text: string;
  try {
    text = await readFile(planPath, "utf8");
  } catch {
    return [];
  }
  const startIndex = text.indexOf(WORKSPACE_STATE_START);
  const endIndex = text.indexOf(WORKSPACE_STATE_END);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    return [];
  }
  const raw = text
    .slice(startIndex + WORKSPACE_STATE_START.length, endIndex)
    .trim()
    .replace(JSON_FENCE_START_RE, "")
    .replace(JSON_FENCE_END_RE, "")
    .trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return [];
    }
    const commits = (parsed as Record<string, unknown>).acceptedCommits;
    if (!Array.isArray(commits)) {
      return [];
    }
    return commits.filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === "object" && entry !== null && !Array.isArray(entry)
    );
  } catch {
    return [];
  }
};

const hasTerminalCommit = (
  commits: readonly Record<string, unknown>[],
  stage: string,
  message: string
): boolean =>
  commits.some(
    (commit) =>
      commit.stage === stage &&
      commit.message === message &&
      typeof commit.commitHash === "string" &&
      commit.commitHash.trim().length > 0
  );

// Stage-light truth: completed upstream stages stay completed once their own
// terminal managed commit is recorded in workspace.plan.md acceptedCommits.
// Downstream dirty paths, blockers, or repair tasks cannot flip a recorded
// terminal stage back to in_progress; only an explicit revision/rebuild
// commit removes the prior terminal evidence.
export const applyCommittedTerminalEvidence = async (params: {
  readonly state: WorkflowState;
  readonly workspaceRoot: string;
}): Promise<WorkflowState> => {
  const commits = await readWorkspaceAcceptedCommits(params.workspaceRoot);
  if (commits.length === 0) {
    return params.state;
  }
  const applicationSkeletonCommitted = hasTerminalCommit(
    commits,
    "application_skeleton",
    APPLICATION_SKELETON_TERMINAL_COMMIT
  );
  const qualityGatesCommitted = hasTerminalCommit(
    commits,
    "quality_gates",
    QUALITY_GATES_TERMINAL_COMMIT
  );
  if (!(applicationSkeletonCommitted || qualityGatesCommitted)) {
    return params.state;
  }
  return {
    ...params.state,
    stages: {
      ...params.state.stages,
      application_skeleton: applicationSkeletonCommitted
        ? { ...params.state.stages.application_skeleton, status: "completed" }
        : params.state.stages.application_skeleton,
      quality_gates: qualityGatesCommitted
        ? { ...params.state.stages.quality_gates, status: "completed" }
        : params.state.stages.quality_gates,
    },
  };
};

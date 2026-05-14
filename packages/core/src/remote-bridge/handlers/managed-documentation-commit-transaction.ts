import type { ManagedStageId } from "./managed-git-stage-gate";

const APPLICATION_SKELETON_REVIEW_TASK_LINE_RE =
  /^(\d+)\.\s*\[\w+\]\s*`application-skeleton\.phase2\.review\.task1`/mu;
const APPLICATION_SKELETON_REVISION_TASK_RE =
  /`application-skeleton\.phase2\.review\.revision(\d+)\.task1`/gu;
const ACTIVE_PLAN_STATE_BLOCK_RE =
  /<!-- codeai-plan-state:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- codeai-plan-state:end -->/u;
const MANAGED_DOCUMENTATION_COMMIT_DISABLED_REASON =
  "Managed documentation commit ownership is disabled while the managed workflow orchestration cluster is being rewritten.";

export interface ApplicationSkeletonReviewRevisionInjection {
  readonly nextCommitMessage: string;
  readonly nextCurrentTaskId: string;
  readonly nextPlanText: string;
  readonly nextRevisionNumber: number;
}

// Kept temporarily for existing revision-runner tests; commit ownership itself
// is disabled below and this helper is removed in the repair/revision cleanup.
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

export class ManagedDocumentationCommitTransaction {
  commitAcceptedStage(_params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ManagedDocumentationCommitTransactionResult> {
    return Promise.resolve(
      blocked(MANAGED_DOCUMENTATION_COMMIT_DISABLED_REASON, [])
    );
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

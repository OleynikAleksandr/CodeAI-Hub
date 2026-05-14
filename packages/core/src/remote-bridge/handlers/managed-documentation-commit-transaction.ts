import type { ManagedStageId } from "./managed-git-stage-gate";

const MANAGED_DOCUMENTATION_COMMIT_DISABLED_REASON =
  "Managed documentation commit ownership is disabled while the managed workflow orchestration cluster is being rewritten.";

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

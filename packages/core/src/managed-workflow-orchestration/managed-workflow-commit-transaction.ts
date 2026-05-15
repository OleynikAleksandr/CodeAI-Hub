import type { ManagedWorkflowRequestCommitEffect } from "./managed-workflow-effects";
import type { ManagedWorkflowStageId } from "./managed-workflow-orchestration-contracts";

const GIT_HASH_PATTERN = /^[0-9a-f]{7,40}$/iu;
const PSEUDO_HASH_VALUES = new Set([
  "included-in-commit",
  "not-created-user-accepted-without-review-revision",
  "tbd",
]);

export interface ManagedWorkflowPendingCommit {
  readonly allowedPaths: readonly string[];
  readonly expectedCommitMessage: string;
  readonly requestId: string;
  readonly stageId: ManagedWorkflowStageId;
}

export interface ManagedWorkflowFinalizedCommit
  extends ManagedWorkflowPendingCommit {
  readonly hash: string;
}

const isRealGitHash = (hash: string): boolean =>
  GIT_HASH_PATTERN.test(hash) && !PSEUDO_HASH_VALUES.has(hash.toLowerCase());

export class ManagedWorkflowCommitTransaction {
  readonly #pendingById = new Map<string, ManagedWorkflowPendingCommit>();

  finalize(options: {
    readonly hash: string;
    readonly requestId: string;
  }): ManagedWorkflowFinalizedCommit {
    if (!isRealGitHash(options.hash)) {
      throw new Error(
        `Managed workflow commit hash is not a real Git hash: ${options.hash}`
      );
    }
    const pending = this.#pendingById.get(options.requestId);
    if (!pending) {
      throw new Error(
        `Managed workflow commit request not found: ${options.requestId}`
      );
    }
    this.#pendingById.delete(options.requestId);
    return { ...pending, hash: options.hash };
  }

  listPending(): readonly ManagedWorkflowPendingCommit[] {
    return Array.from(this.#pendingById.values());
  }

  recordRequest(options: {
    readonly effect: ManagedWorkflowRequestCommitEffect;
    readonly requestId: string;
  }): ManagedWorkflowPendingCommit {
    const pending: ManagedWorkflowPendingCommit = {
      allowedPaths: options.effect.allowedPaths,
      expectedCommitMessage: options.effect.expectedCommitMessage,
      requestId: options.requestId,
      stageId: options.effect.stageId,
    };
    this.#pendingById.set(options.requestId, pending);
    return pending;
  }
}

import type { ManagedWorkflowSnapshot } from "./managed-workflow-snapshot";

export type ManagedWorkflowRecoveryAction =
  | "wait_user"
  | "wait_provider"
  | "retry_provider"
  | "blocked"
  | "panic_stop";

export interface ManagedWorkflowRecoveryDecision {
  readonly action: ManagedWorkflowRecoveryAction;
  readonly reason: string;
}

export class ManagedWorkflowRecoveryArbiter {
  readonly #retryAfterMs: number;

  constructor(options?: { readonly retryAfterMs?: number }) {
    this.#retryAfterMs = options?.retryAfterMs ?? 60_000;
  }

  decide(options: {
    readonly idleForMs: number;
    readonly snapshot: ManagedWorkflowSnapshot;
  }): ManagedWorkflowRecoveryDecision {
    const { idleForMs, snapshot } = options;
    if (snapshot.status === "panic_stopped") {
      return {
        action: "panic_stop",
        reason: "Managed workflow is in panic stop state.",
      };
    }
    if (
      snapshot.status === "blocked" ||
      snapshot.status === "preview_blocked"
    ) {
      return {
        action: "blocked",
        reason: snapshot.blocker?.detail ?? "Managed workflow is blocked.",
      };
    }
    if (snapshot.status === "waiting_for_user") {
      return {
        action: "wait_user",
        reason: "Waiting for user acceptance or revision request.",
      };
    }
    if (snapshot.status === "waiting_for_provider") {
      return idleForMs >= this.#retryAfterMs
        ? {
            action: "retry_provider",
            reason: "Provider turn exceeded retry threshold.",
          }
        : {
            action: "wait_provider",
            reason: "Provider turn is still within retry threshold.",
          };
    }
    return {
      action: "wait_provider",
      reason: `No recovery action required for ${snapshot.status}.`,
    };
  }
}

import type { ManagedWorkflowEffect } from "./managed-workflow-effects";
import type { ManagedWorkflowStageId } from "./managed-workflow-orchestration-contracts";

export type ManagedWorkflowAuditCategory =
  | "core_decision"
  | "effect"
  | "blocker"
  | "provider_message"
  | "recovery";

export interface ManagedWorkflowAuditEntry {
  readonly category: ManagedWorkflowAuditCategory;
  readonly detail: string;
  readonly entryId: string;
  readonly recordedAt: string;
  readonly stageId: ManagedWorkflowStageId;
}

export class ManagedWorkflowAuditLog {
  readonly #entries: ManagedWorkflowAuditEntry[] = [];

  list(): readonly ManagedWorkflowAuditEntry[] {
    return [...this.#entries];
  }

  record(entry: ManagedWorkflowAuditEntry): void {
    this.#entries.push(entry);
  }

  recordEffect(options: {
    readonly effect: ManagedWorkflowEffect;
    readonly entryId: string;
    readonly recordedAt: string;
  }): ManagedWorkflowAuditEntry {
    const entry: ManagedWorkflowAuditEntry = {
      category:
        options.effect.kind === "append_core_message" &&
        options.effect.visibleToProvider
          ? "provider_message"
          : "effect",
      detail: options.effect.kind,
      entryId: options.entryId,
      recordedAt: options.recordedAt,
      stageId: options.effect.stageId,
    };
    this.record(entry);
    return entry;
  }

  recordRecovery(options: {
    readonly detail: string;
    readonly entryId: string;
    readonly recordedAt: string;
    readonly stageId: ManagedWorkflowStageId;
  }): ManagedWorkflowAuditEntry {
    const entry: ManagedWorkflowAuditEntry = {
      category: "recovery",
      detail: options.detail,
      entryId: options.entryId,
      recordedAt: options.recordedAt,
      stageId: options.stageId,
    };
    this.record(entry);
    return entry;
  }
}

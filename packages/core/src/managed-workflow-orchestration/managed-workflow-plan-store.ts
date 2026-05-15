import type {
  ManagedWorkflowLedgerLookup,
  ManagedWorkflowLedgerRecord,
} from "./managed-workflow-ledger-types";
import type { ManagedWorkflowStageId } from "./managed-workflow-orchestration-contracts";
import {
  createManagedWorkflowPhaseSnapshot,
  TYPE_A_CORE_GATED_PHASE,
} from "./managed-workflow-phase-contracts";
import type {
  ManagedWorkflowRunStatus,
  ManagedWorkflowSnapshot,
} from "./managed-workflow-snapshot";

const buildLedgerKey = (lookup: ManagedWorkflowLedgerLookup): string =>
  `${lookup.workspaceSlug}:${lookup.stageId}`;

export class ManagedWorkflowPlanStore {
  readonly #recordsByKey = new Map<string, ManagedWorkflowLedgerRecord[]>();

  append(record: ManagedWorkflowLedgerRecord): void {
    const key = buildLedgerKey(record);
    const records = this.#recordsByKey.get(key) ?? [];
    this.#recordsByKey.set(key, [...records, record]);
  }

  appendSnapshot(options: {
    readonly recordedAt: string;
    readonly recordId: string;
    readonly snapshot: ManagedWorkflowSnapshot;
  }): ManagedWorkflowLedgerRecord {
    const record: ManagedWorkflowLedgerRecord = {
      kind: "snapshot",
      recordedAt: options.recordedAt,
      recordId: options.recordId,
      snapshot: options.snapshot,
      stageId: options.snapshot.stageId,
      workspaceSlug: options.snapshot.workspaceSlug,
    };
    this.append(record);
    return record;
  }

  appendStageStartSnapshot(options: {
    readonly recordedAt: string;
    readonly recordId: string;
    readonly stageId: ManagedWorkflowStageId;
    readonly status?: ManagedWorkflowRunStatus;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): ManagedWorkflowLedgerRecord {
    return this.appendSnapshot({
      recordedAt: options.recordedAt,
      recordId: options.recordId,
      snapshot: {
        accepted: false,
        activeTaskId: `${options.stageId}.phase1.task1`,
        blocker: null,
        currentPhase: createManagedWorkflowPhaseSnapshot(
          TYPE_A_CORE_GATED_PHASE
        ),
        integrated: false,
        lastCoreMessage: "Core opened a managed workflow phase.",
        materialized: false,
        stageId: options.stageId,
        status: options.status ?? "core_gated",
        updatedAt: options.recordedAt,
        version: 1,
        workspaceRoot: options.workspaceRoot,
        workspaceSlug: options.workspaceSlug,
      },
    });
  }

  readLedger(
    lookup: ManagedWorkflowLedgerLookup
  ): readonly ManagedWorkflowLedgerRecord[] {
    return [...(this.#recordsByKey.get(buildLedgerKey(lookup)) ?? [])];
  }

  readLatestSnapshot(
    lookup: ManagedWorkflowLedgerLookup
  ): ManagedWorkflowSnapshot | null {
    const records = this.readLedger(lookup);
    for (let index = records.length - 1; index >= 0; index -= 1) {
      const snapshot = records[index]?.snapshot;
      if (snapshot) {
        return snapshot;
      }
    }
    return null;
  }
}

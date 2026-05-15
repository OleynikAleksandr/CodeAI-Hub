import type {
  ManagedWorkflowLedgerLookup,
  ManagedWorkflowLedgerRecord,
} from "./managed-workflow-ledger-types";
import type { ManagedWorkflowSnapshot } from "./managed-workflow-snapshot";

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

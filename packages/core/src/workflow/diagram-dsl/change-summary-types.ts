export type ChangeSummaryEntityType = "module" | "relation";

export type ChangeSummaryAction = "added" | "removed" | "modified";

export interface EntityChange {
  readonly action: ChangeSummaryAction;
  readonly entityId: string;
  readonly entityType: ChangeSummaryEntityType;
  readonly modifiedFields?: readonly string[];
  readonly summary?: string;
}

export interface ChangeSummary {
  readonly baselineRevision: string;
  readonly changes: readonly EntityChange[];
  readonly currentRevision: string;
}

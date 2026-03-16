export type ChangeSummaryEntityType =
  | "module"
  | "relation"
  | "facade"
  | "facade-relation";

export type ChangeSummaryAction = "added" | "removed" | "modified";

export type EntityChange = {
  readonly entityType: ChangeSummaryEntityType;
  readonly entityId: string;
  readonly action: ChangeSummaryAction;
  readonly modifiedFields?: readonly string[];
  readonly summary?: string;
};

export type ChangeSummary = {
  readonly baselineRevision: string;
  readonly currentRevision: string;
  readonly changes: readonly EntityChange[];
};

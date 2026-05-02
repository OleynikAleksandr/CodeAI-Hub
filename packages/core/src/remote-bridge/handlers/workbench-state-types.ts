export type WorkbenchCaptureMode = "managed" | "vanilla";
export type WorkbenchStateKind = "index" | "selection";

export interface SlotEntryRecord {
  readonly artifactId: string;
  readonly capturedAt: string;
  readonly jsonlPath: string;
  readonly markdownPath: string;
  readonly releaseVersion: string;
}

export interface WorkbenchSlotCaptureState {
  readonly current: SlotEntryRecord | null;
  readonly previous: SlotEntryRecord | null;
}

export interface WorkbenchSlotRecord {
  readonly managed: WorkbenchSlotCaptureState;
  readonly model: string;
  readonly provider: string;
  readonly reasoning: string;
  readonly step: string;
  readonly vanilla: WorkbenchSlotCaptureState;
}

export interface WorkbenchIndexFile {
  readonly slots: readonly WorkbenchSlotRecord[];
  readonly version: 1;
}

export interface WorkbenchSelectionState {
  readonly model: string;
  readonly provider: string;
  readonly reasoning: string;
  readonly step: string;
}

export interface WorkbenchSelectionFile {
  readonly selection: WorkbenchSelectionState | null;
  readonly updatedAt?: string;
  readonly version: 1;
}

export interface WorkbenchArtifactReadPayload {
  readonly jsonlPath: string;
}

export interface WorkbenchStatePayloadByKind {
  readonly index: WorkbenchIndexFile;
  readonly selection: WorkbenchSelectionFile;
}

export const isWorkbenchStateKind = (
  value: unknown
): value is WorkbenchStateKind => value === "index" || value === "selection";

export const isWorkbenchIndexFile = (
  value: unknown
): value is WorkbenchIndexFile =>
  isRecord(value) &&
  value.version === 1 &&
  Array.isArray(value.slots) &&
  value.slots.every(isWorkbenchSlotRecord);

export const isWorkbenchSelectionFile = (
  value: unknown
): value is WorkbenchSelectionFile =>
  isRecord(value) &&
  value.version === 1 &&
  (value.selection === null || isWorkbenchSelectionState(value.selection)) &&
  isOptionalNonEmptyString(value.updatedAt);

export const isWorkbenchArtifactReadPayload = (
  value: unknown
): value is WorkbenchArtifactReadPayload =>
  isRecord(value) && isNonEmptyString(value.jsonlPath);

export const isWorkbenchStatePayload = <Kind extends WorkbenchStateKind>(
  kind: Kind,
  payload: unknown
): payload is WorkbenchStatePayloadByKind[Kind] =>
  kind === "index"
    ? isWorkbenchIndexFile(payload)
    : isWorkbenchSelectionFile(payload);

const isWorkbenchSlotRecord = (value: unknown): value is WorkbenchSlotRecord =>
  isRecord(value) &&
  isNonEmptyString(value.step) &&
  isNonEmptyString(value.provider) &&
  isNonEmptyString(value.model) &&
  isNonEmptyString(value.reasoning) &&
  isWorkbenchSlotCaptureState(value.managed) &&
  isWorkbenchSlotCaptureState(value.vanilla);

const isWorkbenchSlotCaptureState = (
  value: unknown
): value is WorkbenchSlotCaptureState =>
  isRecord(value) &&
  (value.current === null || isSlotEntryRecord(value.current)) &&
  (value.previous === null || isSlotEntryRecord(value.previous));

const isSlotEntryRecord = (value: unknown): value is SlotEntryRecord =>
  isRecord(value) &&
  isNonEmptyString(value.markdownPath) &&
  isNonEmptyString(value.jsonlPath) &&
  isNonEmptyString(value.artifactId) &&
  isNonEmptyString(value.capturedAt) &&
  isNonEmptyString(value.releaseVersion);

const isWorkbenchSelectionState = (
  value: unknown
): value is WorkbenchSelectionState =>
  isRecord(value) &&
  isNonEmptyString(value.step) &&
  isNonEmptyString(value.provider) &&
  isNonEmptyString(value.model) &&
  isNonEmptyString(value.reasoning);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isOptionalNonEmptyString = (value: unknown): boolean =>
  value === undefined || isNonEmptyString(value);

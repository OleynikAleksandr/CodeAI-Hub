import type { SettingsNativeRequestCaptureResultPayload } from "../core-stream-message-types";
import type {
  SlotEntryRecord,
  WorkbenchCaptureMode,
  WorkbenchIndexFile,
  WorkbenchSlotCaptureState,
  WorkbenchSlotRecord,
} from "./workbench-bridge-types";
import type { WorkbenchStateClientApi } from "./workbench-state-client";

export interface WorkbenchSlotKey {
  readonly model: string;
  readonly provider: string;
  readonly reasoning: string;
  readonly step: string;
}

export interface WorkbenchCaptureRotationInput {
  readonly captureResult: SettingsNativeRequestCaptureResultPayload;
  readonly mode: WorkbenchCaptureMode;
  readonly records: readonly unknown[];
  readonly slot: WorkbenchSlotKey;
}

export interface WorkbenchIndexStoreApi {
  loadIndex(): Promise<WorkbenchIndexFile>;
  rotateCapture(input: WorkbenchCaptureRotationInput): Promise<WorkbenchIndexFile>;
}

class WorkbenchIndexStore implements WorkbenchIndexStoreApi {
  readonly #client: Pick<WorkbenchStateClientApi, "loadIndex" | "saveIndex">;

  constructor(
    client: Pick<WorkbenchStateClientApi, "loadIndex" | "saveIndex">
  ) {
    this.#client = client;
  }

  async loadIndex(): Promise<WorkbenchIndexFile> {
    return (await this.#client.loadIndex()) ?? EMPTY_INDEX;
  }

  async rotateCapture(
    input: WorkbenchCaptureRotationInput
  ): Promise<WorkbenchIndexFile> {
    const record = materializeSlotEntry(input.captureResult, input.records);
    if (!record) {
      throw new Error("Cannot materialize workbench slot entry");
    }
    const nextIndex = rotateIndexSlot(await this.loadIndex(), {
      mode: input.mode,
      record,
      slot: input.slot,
    });
    await this.#client.saveIndex(nextIndex);
    return nextIndex;
  }
}

export const createWorkbenchIndexStore = (
  client: Pick<WorkbenchStateClientApi, "loadIndex" | "saveIndex">
): WorkbenchIndexStoreApi => new WorkbenchIndexStore(client);

export const resolveWorkbenchSlot = (
  index: WorkbenchIndexFile,
  key: WorkbenchSlotKey
): WorkbenchSlotRecord | null =>
  index.slots.find((slot) => hasSlotKey(slot, key)) ?? null;

const EMPTY_INDEX: WorkbenchIndexFile = { version: 1, slots: [] };

const rotateIndexSlot = (
  index: WorkbenchIndexFile,
  input: {
    readonly mode: WorkbenchCaptureMode;
    readonly record: SlotEntryRecord;
    readonly slot: WorkbenchSlotKey;
  }
): WorkbenchIndexFile => {
  const existing = resolveWorkbenchSlot(index, input.slot);
  const nextSlot = rotateSlot(existing ?? createEmptySlot(input.slot), input);
  const slots = existing
    ? index.slots.map((slot) => (hasSlotKey(slot, input.slot) ? nextSlot : slot))
    : [...index.slots, nextSlot];
  return { version: 1, slots };
};

const rotateSlot = (
  slot: WorkbenchSlotRecord,
  input: {
    readonly mode: WorkbenchCaptureMode;
    readonly record: SlotEntryRecord;
  }
): WorkbenchSlotRecord => {
  const previousState = slot[input.mode];
  const nextState: WorkbenchSlotCaptureState = {
    current: input.record,
    previous: previousState.current,
  };
  return { ...slot, [input.mode]: nextState };
};

const createEmptySlot = (key: WorkbenchSlotKey): WorkbenchSlotRecord => ({
  ...key,
  managed: { current: null, previous: null },
  vanilla: { current: null, previous: null },
});

const hasSlotKey = (
  slot: WorkbenchSlotRecord,
  key: WorkbenchSlotKey
): boolean =>
  slot.step === key.step &&
  slot.provider === key.provider &&
  slot.model === key.model &&
  slot.reasoning === key.reasoning;

const materializeSlotEntry = (
  captureResult: SettingsNativeRequestCaptureResultPayload,
  records: readonly unknown[]
): SlotEntryRecord | null => {
  const jsonlPath = readString(captureResult.jsonlPath);
  const markdownPath = readString(captureResult.markdownPath);
  const captureStart = records.find(isCaptureStartRecord);
  const capturedAt = readString(captureStart?.timestamp);
  const releaseVersion = readString(captureStart?.releaseVersion);
  if (!(jsonlPath && markdownPath && capturedAt && releaseVersion)) {
    return null;
  }
  return {
    artifactId:
      readString(captureStart?.captureId) ?? artifactIdFromPath(jsonlPath),
    capturedAt,
    jsonlPath,
    markdownPath,
    releaseVersion,
  };
};

const isCaptureStartRecord = (
  value: unknown
): value is Record<string, unknown> =>
  isRecord(value) && value.type === "capture_start";

const artifactIdFromPath = (jsonlPath: string): string => {
  const basename = jsonlPath.split(/[\\/]/).pop() ?? jsonlPath;
  return basename.endsWith(".jsonl") ? basename.slice(0, -6) : basename;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

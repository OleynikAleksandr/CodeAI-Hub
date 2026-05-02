export type WorkbenchCaptureMode = "managed" | "vanilla";
export type WorkbenchStateKind = "index" | "selection";

export type SlotEntryRecord = {
  readonly artifactId: string;
  readonly capturedAt: string;
  readonly jsonlPath: string;
  readonly markdownPath: string;
  readonly releaseVersion: string;
};

export type WorkbenchSlotCaptureState = {
  readonly current: SlotEntryRecord | null;
  readonly previous: SlotEntryRecord | null;
};

export type WorkbenchSlotRecord = {
  readonly managed: WorkbenchSlotCaptureState;
  readonly model: string;
  readonly provider: string;
  readonly reasoning: string;
  readonly step: string;
  readonly vanilla: WorkbenchSlotCaptureState;
};

export type WorkbenchIndexFile = {
  readonly slots: readonly WorkbenchSlotRecord[];
  readonly version: 1;
};

export type WorkbenchSelectionState = {
  readonly model: string;
  readonly provider: string;
  readonly reasoning: string;
  readonly step: string;
};

export type WorkbenchSelectionFile = {
  readonly selection: WorkbenchSelectionState | null;
  readonly updatedAt?: string;
  readonly version: 1;
};

export type WorkbenchStateFile = WorkbenchIndexFile | WorkbenchSelectionFile;

export type WorkbenchOutgoingMessage =
  | {
      readonly type: "workbench:state:load";
      readonly payload: { readonly kind: WorkbenchStateKind };
    }
  | {
      readonly type: "workbench:state:save";
      readonly payload: {
        readonly kind: WorkbenchStateKind;
        readonly state: WorkbenchStateFile;
      };
    }
  | {
      readonly type: "workbench:artifact:read";
      readonly payload: { readonly jsonlPath: string };
    };

export type WorkbenchBridgeEvent =
  | {
      readonly type: "workbench:state:loaded";
      readonly payload: {
        readonly error: string | null;
        readonly kind: WorkbenchStateKind;
        readonly payload: WorkbenchStateFile | null;
      };
    }
  | {
      readonly type: "workbench:state:saved";
      readonly payload: {
        readonly kind: WorkbenchStateKind;
        readonly ok: true;
      };
    }
  | {
      readonly type: "workbench:state:save-error";
      readonly payload: {
        readonly error: string;
        readonly kind: WorkbenchStateKind;
      };
    }
  | {
      readonly type: "workbench:artifact:loaded";
      readonly payload: {
        readonly jsonlPath: string;
        readonly records: readonly unknown[];
      };
    }
  | {
      readonly type: "workbench:artifact:error";
      readonly payload: {
        readonly error: string;
        readonly jsonlPath: string;
      };
    };

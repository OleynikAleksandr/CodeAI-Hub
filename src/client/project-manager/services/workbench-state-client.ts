import type { IncomingMessage } from "../core-stream-message-types";
import type {
  WorkbenchBridgeEvent,
  WorkbenchIndexFile,
  WorkbenchOutgoingMessage,
  WorkbenchSelectionFile,
  WorkbenchStateFile,
  WorkbenchStateKind,
} from "./workbench-bridge-types";

const DEFAULT_TIMEOUT_MS = 15_000;

interface WorkbenchStateClientTransport {
  readonly onCoreEvent: (
    listener: (message: IncomingMessage) => void
  ) => () => void;
  readonly sendWorkbenchMessage: (message: WorkbenchOutgoingMessage) => void;
}

export interface WorkbenchStateClientApi {
  loadIndex(): Promise<WorkbenchIndexFile | null>;
  loadSelection(): Promise<WorkbenchSelectionFile | null>;
  readArtifactRecords(jsonlPath: string): Promise<readonly unknown[]>;
  saveIndex(index: WorkbenchIndexFile): Promise<void>;
  saveSelection(selection: WorkbenchSelectionFile): Promise<void>;
}

class WorkbenchStateClient implements WorkbenchStateClientApi {
  readonly #timeoutMs: number;
  readonly #transport: WorkbenchStateClientTransport;

  constructor(
    transport: WorkbenchStateClientTransport,
    options: { readonly timeoutMs?: number } = {}
  ) {
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#transport = transport;
  }

  async loadIndex(): Promise<WorkbenchIndexFile | null> {
    const event = await this.#requestStateLoad("index");
    if (event.payload.error) {
      throw new Error(event.payload.error);
    }
    const payload = event.payload.payload;
    if (payload === null || isWorkbenchIndexFile(payload)) {
      return payload;
    }
    throw new Error("Invalid workbench index payload");
  }

  async loadSelection(): Promise<WorkbenchSelectionFile | null> {
    const event = await this.#requestStateLoad("selection");
    if (event.payload.error) {
      throw new Error(event.payload.error);
    }
    const payload = event.payload.payload;
    if (payload === null || isWorkbenchSelectionFile(payload)) {
      return payload;
    }
    throw new Error("Invalid workbench selection payload");
  }

  async saveIndex(index: WorkbenchIndexFile): Promise<void> {
    await this.#requestStateSave("index", index);
  }

  async saveSelection(selection: WorkbenchSelectionFile): Promise<void> {
    await this.#requestStateSave("selection", selection);
  }

  async readArtifactRecords(jsonlPath: string): Promise<readonly unknown[]> {
    const event = await this.#waitForEvent(
      (candidate) =>
        (candidate.type === "workbench:artifact:loaded" ||
          candidate.type === "workbench:artifact:error") &&
        candidate.payload.jsonlPath === jsonlPath,
      () => {
        this.#transport.sendWorkbenchMessage({
          type: "workbench:artifact:read",
          payload: { jsonlPath },
        });
      }
    );
    if (event.type === "workbench:artifact:error") {
      throw new Error(event.payload.error);
    }
    if (event.type === "workbench:artifact:loaded") {
      return event.payload.records;
    }
    throw new Error(`Unexpected workbench artifact event: ${event.type}`);
  }

  async #requestStateLoad(
    kind: WorkbenchStateKind
  ): Promise<
    Extract<WorkbenchBridgeEvent, { readonly type: "workbench:state:loaded" }>
  > {
    const event = await this.#waitForEvent(
      (candidate) =>
        candidate.type === "workbench:state:loaded" &&
        candidate.payload.kind === kind,
      () => {
        this.#transport.sendWorkbenchMessage({
          type: "workbench:state:load",
          payload: { kind },
        });
      }
    );
    if (event.type !== "workbench:state:loaded") {
      throw new Error(`Unexpected workbench state load event: ${event.type}`);
    }
    return event;
  }

  async #requestStateSave(
    kind: WorkbenchStateKind,
    state: WorkbenchStateFile
  ): Promise<void> {
    const event = await this.#waitForEvent(
      (candidate) =>
        (candidate.type === "workbench:state:saved" ||
          candidate.type === "workbench:state:save-error") &&
        candidate.payload.kind === kind,
      () => {
        this.#transport.sendWorkbenchMessage({
          type: "workbench:state:save",
          payload: { kind, state },
        });
      }
    );
    if (event.type === "workbench:state:save-error") {
      throw new Error(event.payload.error);
    }
  }

  async #waitForEvent(
    matcher: (event: WorkbenchBridgeEvent) => boolean,
    send: () => void
  ): Promise<WorkbenchBridgeEvent> {
    return new Promise((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const cleanup = this.#transport.onCoreEvent((message) => {
        const event = parseWorkbenchBridgeEvent(message);
        if (!(event && matcher(event))) {
          return;
        }
        if (timeout) {
          clearTimeout(timeout);
        }
        cleanup();
        resolve(event);
      });
      timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Timed out waiting for workbench bridge event"));
      }, this.#timeoutMs);
      send();
    });
  }
}

export const createWorkbenchStateClient = (
  transport: WorkbenchStateClientTransport,
  options?: { readonly timeoutMs?: number }
): WorkbenchStateClientApi => new WorkbenchStateClient(transport, options);

const parseWorkbenchBridgeEvent = (
  value: unknown
): WorkbenchBridgeEvent | null => {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }
  switch (value.type) {
    case "workbench:state:loaded":
      return parseWorkbenchStateLoadedEvent(value);
    case "workbench:state:saved":
      return parseWorkbenchStateSavedEvent(value);
    case "workbench:state:save-error":
      return parseWorkbenchStateSaveErrorEvent(value);
    case "workbench:artifact:loaded":
      return parseWorkbenchArtifactLoadedEvent(value);
    case "workbench:artifact:error":
      return parseWorkbenchArtifactErrorEvent(value);
    default:
      return null;
  }
};

const parseWorkbenchStateLoadedEvent = (
  value: Record<string, unknown>
): WorkbenchBridgeEvent | null => {
  if (!isRecord(value.payload) || !isWorkbenchStateKind(value.payload.kind)) {
    return null;
  }
  if (!isStringOrNull(value.payload.error)) {
    return null;
  }
  const payload = value.payload.payload;
  if (
    payload !== null &&
    !isWorkbenchIndexFile(payload) &&
    !isWorkbenchSelectionFile(payload)
  ) {
    return null;
  }
  return {
    type: "workbench:state:loaded",
    payload: {
      kind: value.payload.kind,
      payload,
      error: value.payload.error,
    },
  };
};

const parseWorkbenchStateSavedEvent = (
  value: Record<string, unknown>
): WorkbenchBridgeEvent | null =>
  isRecord(value.payload) &&
  isWorkbenchStateKind(value.payload.kind) &&
  value.payload.ok === true
    ? {
        type: "workbench:state:saved",
        payload: { kind: value.payload.kind, ok: true },
      }
    : null;

const parseWorkbenchStateSaveErrorEvent = (
  value: Record<string, unknown>
): WorkbenchBridgeEvent | null =>
  isRecord(value.payload) &&
  isWorkbenchStateKind(value.payload.kind) &&
  typeof value.payload.error === "string"
    ? {
        type: "workbench:state:save-error",
        payload: { kind: value.payload.kind, error: value.payload.error },
      }
    : null;

const parseWorkbenchArtifactLoadedEvent = (
  value: Record<string, unknown>
): WorkbenchBridgeEvent | null =>
  isRecord(value.payload) &&
  typeof value.payload.jsonlPath === "string" &&
  Array.isArray(value.payload.records)
    ? {
        type: "workbench:artifact:loaded",
        payload: {
          jsonlPath: value.payload.jsonlPath,
          records: value.payload.records,
        },
      }
    : null;

const parseWorkbenchArtifactErrorEvent = (
  value: Record<string, unknown>
): WorkbenchBridgeEvent | null =>
  isRecord(value.payload) &&
  typeof value.payload.jsonlPath === "string" &&
  typeof value.payload.error === "string"
    ? {
        type: "workbench:artifact:error",
        payload: {
          jsonlPath: value.payload.jsonlPath,
          error: value.payload.error,
        },
      }
    : null;

const isWorkbenchIndexFile = (value: unknown): value is WorkbenchIndexFile =>
  isRecord(value) &&
  value.version === 1 &&
  Array.isArray(value.slots) &&
  value.slots.every(isWorkbenchSlotRecord);

const isWorkbenchSelectionFile = (
  value: unknown
): value is WorkbenchSelectionFile =>
  isRecord(value) &&
  value.version === 1 &&
  (value.selection === null || isWorkbenchSelectionState(value.selection));

const isWorkbenchStateKind = (value: unknown): value is WorkbenchStateKind =>
  value === "index" || value === "selection";

const isWorkbenchSlotRecord = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.step === "string" &&
  typeof value.provider === "string" &&
  typeof value.model === "string" &&
  typeof value.reasoning === "string" &&
  isWorkbenchSlotCaptureState(value.managed) &&
  isWorkbenchSlotCaptureState(value.vanilla);

const isWorkbenchSlotCaptureState = (value: unknown): boolean =>
  isRecord(value) &&
  (value.current === null || isSlotEntryRecord(value.current)) &&
  (value.previous === null || isSlotEntryRecord(value.previous));

const isSlotEntryRecord = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.markdownPath === "string" &&
  typeof value.jsonlPath === "string" &&
  typeof value.artifactId === "string" &&
  typeof value.capturedAt === "string" &&
  typeof value.releaseVersion === "string";

const isWorkbenchSelectionState = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.step === "string" &&
  typeof value.provider === "string" &&
  typeof value.model === "string" &&
  typeof value.reasoning === "string";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringOrNull = (value: unknown): value is string | null =>
  typeof value === "string" || value === null;

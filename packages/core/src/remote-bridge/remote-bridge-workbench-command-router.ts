import type { WebSocketManager } from "./handlers/websocket-manager";
import { WorkbenchArtifactReader } from "./handlers/workbench-artifact-reader";
import { WorkbenchStatePersistenceHandler } from "./handlers/workbench-state-persistence-handler";
import type {
  WorkbenchIndexFile,
  WorkbenchSelectionFile,
} from "./handlers/workbench-state-types";
import type { IncomingMessage } from "./types";

type WorkbenchStateFile = WorkbenchIndexFile | WorkbenchSelectionFile;

interface RemoteBridgeWorkbenchCommandRouterDependencies {
  readonly artifactReader?: Pick<WorkbenchArtifactReader, "read">;
  readonly getManager: () => WebSocketManager | undefined;
  readonly stateHandler?: Pick<
    WorkbenchStatePersistenceHandler,
    "load" | "save"
  >;
}

export class RemoteBridgeWorkbenchCommandRouter {
  readonly #artifactReader: Pick<WorkbenchArtifactReader, "read">;
  readonly #getManager: () => WebSocketManager | undefined;
  readonly #stateHandler: Pick<
    WorkbenchStatePersistenceHandler,
    "load" | "save"
  >;

  constructor(deps: RemoteBridgeWorkbenchCommandRouterDependencies) {
    this.#artifactReader = deps.artifactReader ?? new WorkbenchArtifactReader();
    this.#getManager = deps.getManager;
    this.#stateHandler =
      deps.stateHandler ?? new WorkbenchStatePersistenceHandler();
  }

  async handleArtifactRead(
    clientId: string,
    payload: Extract<
      IncomingMessage,
      { readonly type: "workbench:artifact:read" }
    >["payload"]
  ): Promise<void> {
    const result = await this.#artifactReader.read(payload);
    if (result.ok) {
      this.#sendToClient(clientId, {
        type: "workbench:artifact:loaded",
        payload: {
          jsonlPath: payload.jsonlPath,
          records: result.records,
        },
      });
      return;
    }
    this.#sendToClient(clientId, {
      type: "workbench:artifact:error",
      payload: {
        jsonlPath: payload.jsonlPath,
        error: result.error,
      },
    });
  }

  async handleStateLoad(
    clientId: string,
    payload: Extract<
      IncomingMessage,
      { readonly type: "workbench:state:load" }
    >["payload"]
  ): Promise<void> {
    try {
      this.#sendToClient(clientId, {
        type: "workbench:state:loaded",
        payload: {
          kind: payload.kind,
          state: await this.#stateHandler.load(payload.kind),
          error: null,
        },
      });
    } catch (error) {
      this.#sendToClient(clientId, {
        type: "workbench:state:loaded",
        payload: {
          kind: payload.kind,
          state: null,
          error: toErrorMessage(error),
        },
      });
    }
  }

  async handleStateSave(
    clientId: string,
    payload: Extract<
      IncomingMessage,
      { readonly type: "workbench:state:save" }
    >["payload"]
  ): Promise<void> {
    try {
      await this.#saveState(payload.kind, payload.state);
      this.#sendToClient(clientId, {
        type: "workbench:state:saved",
        payload: { kind: payload.kind, error: null },
      });
    } catch (error) {
      this.#sendToClient(clientId, {
        type: "workbench:state:save-error",
        payload: { kind: payload.kind, error: toErrorMessage(error) },
      });
    }
  }

  async #saveState(
    kind: "index" | "selection",
    state: WorkbenchStateFile
  ): Promise<void> {
    if (kind === "index") {
      await this.#stateHandler.save("index", state as WorkbenchIndexFile);
      return;
    }
    await this.#stateHandler.save("selection", state as WorkbenchSelectionFile);
  }

  #sendToClient(
    clientId: string,
    event: Parameters<WebSocketManager["sendToClient"]>[1]
  ): void {
    this.#getManager()?.sendToClient(clientId, event);
  }
}

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

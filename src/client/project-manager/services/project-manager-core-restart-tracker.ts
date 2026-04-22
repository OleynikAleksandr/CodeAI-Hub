import { requestCoreFromSupervisor } from "../../ui/src/core-bridge/supervisor-requests";
import type { IncomingMessage } from "../core-stream-message-types";

type CoreControlStatusPayload = {
  readonly busy: boolean;
  readonly message: string;
  readonly phase: "stopping" | "waiting" | "starting" | "ready" | "error";
};

const createCoreControlStatusMessage = (
  payload: CoreControlStatusPayload
): IncomingMessage => ({
  type: "settings:core-control-status",
  payload,
});

export class ProjectManagerCoreRestartTracker {
  private pending = false;
  private readonly emit: (message: IncomingMessage) => void;

  constructor(emit: (message: IncomingMessage) => void) {
    this.emit = emit;
  }

  requestRestart(): void {
    this.pending = true;
    this.emit(
      createCoreControlStatusMessage({
        busy: true,
        message: "Restart requested. Preparing shutdown...",
        phase: "stopping",
      })
    );
    requestCoreFromSupervisor("restart");
  }

  handleSocketOpen(): void {
    if (!this.pending) {
      return;
    }

    this.emit(
      createCoreControlStatusMessage({
        busy: true,
        message: "Core connection restored. Reloading settings...",
        phase: "starting",
      })
    );
  }

  handleSocketClose(): void {
    if (!this.pending) {
      return;
    }

    this.emit(
      createCoreControlStatusMessage({
        busy: true,
        message: "Waiting for Core to restart...",
        phase: "waiting",
      })
    );
  }

  handleIncomingMessage(message: IncomingMessage): void {
    if (!(this.pending && message.type === "settings:loaded")) {
      return;
    }

    this.pending = false;
    this.emit(
      createCoreControlStatusMessage({
        busy: false,
        message: "Core restart completed.",
        phase: "ready",
      })
    );
  }
}

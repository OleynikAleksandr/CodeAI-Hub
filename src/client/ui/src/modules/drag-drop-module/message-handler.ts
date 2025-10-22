import vscode from "../../vscode";
import type { DragDropLogger } from "./data-transfer-file-extractor";

export type MessageCallbacks = {
  readonly onPathInsert?: (path: string) => void;
  readonly onClipboardContent?: (content: string) => void;
};

type OutgoingCommand = "grabFilePathFromDrop" | "clearAllClipboards";

type GrabPayload = {
  readonly timestamp: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export class MessageHandler {
  private callbacks: MessageCallbacks = {};
  private messageListener: ((event: MessageEvent) => void) | null = null;
  private readonly logger?: DragDropLogger;

  constructor(logger?: DragDropLogger) {
    this.logger = logger;
  }

  startListening(callbacks: MessageCallbacks): void {
    this.callbacks = callbacks;
    this.messageListener = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };

    window.addEventListener("message", this.messageListener);
    this.logger?.("message-handler:start");
  }

  stopListening(): void {
    if (this.messageListener) {
      window.removeEventListener("message", this.messageListener);
      this.messageListener = null;
    }
    this.callbacks = {};
    this.logger?.("message-handler:stop");
  }

  requestFilePathGrab(): void {
    const timestamp = Date.now();
    this.sendMessage("grabFilePathFromDrop", { timestamp });
  }

  clearClipboards(): void {
    this.sendMessage("clearAllClipboards");
  }

  sendMessage(command: OutgoingCommand, payload?: GrabPayload): void {
    const message: Record<string, unknown> = { command };
    if (payload) {
      Object.assign(message, payload);
    }
    this.logger?.("message-handler:send", command, payload ?? null);
    vscode.postMessage(message);
  }

  private handleMessage(message: unknown): void {
    if (!isRecord(message) || typeof message.command !== "string") {
      return;
    }

    if (message.command === "insertPath") {
      this.handleInsertPath(
        typeof message.path === "string" ? message.path : ""
      );
      return;
    }

    if (message.command === "clipboardContent") {
      this.handleClipboardContent(
        typeof message.content === "string" ? message.content : ""
      );
    }
  }

  private handleInsertPath(path: string): void {
    if (!path) {
      return;
    }

    this.logger?.("message-handler:insert-path", path);
    this.callbacks.onPathInsert?.(path);
    this.clearClipboards();
  }

  private handleClipboardContent(content: string): void {
    if (!content) {
      return;
    }

    this.logger?.("message-handler:clipboard", content);
    this.callbacks.onClipboardContent?.(content);
    this.clearClipboards();
  }
}

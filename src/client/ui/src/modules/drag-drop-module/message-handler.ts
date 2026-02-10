import { getVsCodeApi } from "../../vscode";
import type { DragDropLogger } from "./data-transfer-file-extractor";

export type MessageCallbacks = {
  readonly onPathInsert?: (path: string) => void;
  readonly onClipboardContent?: (content: string) => void;
};

type OutgoingCommand = "grabFilePathFromDrop" | "clearAllClipboards";

type GrabPayload = {
  readonly timestamp: number;
};

type FileDropResponse = {
  readonly paths?: readonly string[];
  readonly formatted?: string;
};

const FILE_DROP_ENDPOINT = "/api/v1/file-drop";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const resolveCoreHttpUrl = (): string | null => {
  const globalScope = window as typeof window & {
    __CODEAI_CORE_CONFIG?: { readonly httpUrl?: string };
    codeaiBridgeConfig?: { readonly httpUrl?: string };
  };

  const primaryUrl = globalScope.__CODEAI_CORE_CONFIG?.httpUrl;
  if (typeof primaryUrl === "string" && primaryUrl.length > 0) {
    return primaryUrl;
  }

  const fallbackUrl = globalScope.codeaiBridgeConfig?.httpUrl;
  if (typeof fallbackUrl === "string" && fallbackUrl.length > 0) {
    return fallbackUrl;
  }

  return null;
};

const joinUrl = (baseUrl: string, path: string): string =>
  baseUrl.endsWith("/")
    ? `${baseUrl.slice(0, -1)}${path}`
    : `${baseUrl}${path}`;

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
    this.sendMessage("grabFilePathFromDrop", { timestamp }).catch((error) => {
      this.logger?.("message-handler:request-file-path-grab-error", error);
    });
  }

  clearClipboards(): void {
    this.sendMessage("clearAllClipboards").catch((error) => {
      this.logger?.("message-handler:clear-clipboards-error", error);
    });
  }

  async sendMessage(
    command: OutgoingCommand,
    payload?: GrabPayload
  ): Promise<void> {
    const message: Record<string, unknown> = { command };
    if (payload) {
      Object.assign(message, payload);
    }

    const vscodeApi = getVsCodeApi();
    if (vscodeApi) {
      this.logger?.("message-handler:send", command, payload ?? null);
      vscodeApi.postMessage(message);
      return;
    }

    this.logger?.("message-handler:fallback-send", command, payload ?? null);
    if (command === "grabFilePathFromDrop") {
      await this.captureFileDropViaHttp();
      return;
    }

    await this.clearFileDropViaHttp();
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

  private async captureFileDropViaHttp(): Promise<void> {
    const fileDropUrl = this.resolveFileDropUrl();
    if (!fileDropUrl) {
      return;
    }

    try {
      const response = await fetch(fileDropUrl, {
        method: "POST",
      });
      if (response.status === 204 || !response.ok) {
        return;
      }

      const payload = (await response.json()) as FileDropResponse;
      const formatted = this.resolveFormattedPathPayload(payload);
      if (formatted) {
        this.handleInsertPath(formatted);
      }
    } catch (error) {
      this.logger?.("message-handler:fallback-capture-error", error);
    }
  }

  private async clearFileDropViaHttp(): Promise<void> {
    const fileDropUrl = this.resolveFileDropUrl();
    if (!fileDropUrl) {
      return;
    }

    try {
      await fetch(fileDropUrl, { method: "DELETE" });
    } catch (error) {
      this.logger?.("message-handler:fallback-clear-error", error);
    }
  }

  private resolveFileDropUrl(): string | null {
    const httpUrl = resolveCoreHttpUrl();
    return httpUrl ? joinUrl(httpUrl, FILE_DROP_ENDPOINT) : null;
  }

  private resolveFormattedPathPayload(payload: FileDropResponse): string {
    if (typeof payload.formatted === "string" && payload.formatted.length > 0) {
      return payload.formatted;
    }

    if (!Array.isArray(payload.paths) || payload.paths.length === 0) {
      return "";
    }

    const normalizedPaths = payload.paths.filter(
      (path): path is string => typeof path === "string" && path.length > 0
    );
    if (normalizedPaths.length === 0) {
      return "";
    }

    return `${normalizedPaths.map((path) => `"${path}"`).join("\n")}\n`;
  }
}

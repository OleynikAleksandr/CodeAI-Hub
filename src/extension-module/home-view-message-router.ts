import { type Webview, window } from "vscode";
import { ProviderRegistry } from "../core/providers/provider-registry";
import {
  SessionLauncher,
  type SessionLaunchResult,
} from "../core/session/session-launcher";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../types/provider";
import type { SessionRecord } from "../types/session";

type WebviewCommand =
  | "newSession"
  | "lastSession"
  | "clearSession"
  | "oldSessions"
  | "custom1"
  | "custom2"
  | "custom3"
  | "custom4";

type CommandMessage = { command: WebviewCommand };
type LayoutMessage = { type: "ui:updateLayout"; payload?: unknown };
type GenericMessage = { type: string; payload?: unknown };

type ProviderPickerConfirmMessage = {
  type: "providerPicker:confirm";
  payload: { providerIds: readonly ProviderStackId[] };
};

type ProviderPickerCancelMessage = {
  type: "providerPicker:cancel";
};

type ProviderPickerMessage =
  | ProviderPickerConfirmMessage
  | ProviderPickerCancelMessage;

export type WebviewMessage =
  | CommandMessage
  | LayoutMessage
  | ProviderPickerMessage
  | GenericMessage;

export class HomeViewMessageRouter {
  private readonly providerRegistry: ProviderRegistry;
  private readonly sessionLauncher: SessionLauncher;

  constructor(
    providerRegistry: ProviderRegistry = new ProviderRegistry(),
    sessionLauncher: SessionLauncher = new SessionLauncher()
  ) {
    this.providerRegistry = providerRegistry;
    this.sessionLauncher = sessionLauncher;
  }

  handleMessage(message: WebviewMessage, webview: Webview): void {
    if (this.isCommandMessage(message)) {
      this.handleCommand(message.command, webview);
      return;
    }

    if (this.isProviderPickerMessage(message)) {
      this.handleProviderPickerMessage(message, webview);
      return;
    }

    if (this.isLayoutMessage(message)) {
      this.toLayoutBounds(message.payload);
    }
  }

  private handleCommand(command: WebviewCommand, webview: Webview): void {
    switch (command) {
      case "newSession":
        this.handleNewSession(webview);
        break;
      case "lastSession":
        this.notifyWebview(webview, {
          type: "session:focusLast",
        });
        window.showInformationMessage(
          "Selecting the most recent session (placeholder)."
        );
        break;
      case "clearSession":
        this.notifyWebview(webview, {
          type: "session:clearAll",
        });
        window.showInformationMessage("All sessions cleared (placeholder).");
        break;
      case "oldSessions":
        window.showInformationMessage(
          "Session history view is under construction."
        );
        break;
      case "custom1":
      case "custom2":
      case "custom3":
      case "custom4":
        window.showInformationMessage(
          "Custom quick actions will be defined later."
        );
        break;
      default:
        break;
    }
  }

  private isCommandMessage(message: WebviewMessage): message is CommandMessage {
    return typeof (message as CommandMessage).command === "string";
  }

  private isProviderPickerMessage(
    message: WebviewMessage
  ): message is ProviderPickerMessage {
    const pickerMessage = message as ProviderPickerMessage;
    return (
      pickerMessage?.type === "providerPicker:confirm" ||
      pickerMessage?.type === "providerPicker:cancel"
    );
  }

  private isLayoutMessage(message: WebviewMessage): message is LayoutMessage {
    return (message as LayoutMessage).type === "ui:updateLayout";
  }

  private toLayoutBounds(payload: unknown): void {
    if (!payload || typeof payload !== "object") {
      return;
    }

    const candidate = payload as Record<string, unknown>;
    const keys: Array<keyof typeof candidate> = [
      "x",
      "y",
      "width",
      "height",
      "absoluteX",
      "absoluteY",
    ];

    for (const key of keys) {
      if (typeof candidate[key] !== "number") {
        return;
      }
    }
  }

  private handleNewSession(webview: Webview): void {
    const stacks = this.providerRegistry
      .listStacks()
      .filter((stack) => stack.connected);

    if (stacks.length === 0) {
      window.showWarningMessage(
        "No connected provider stacks detected. Install a provider CLI to continue."
      );
      return;
    }

    const payload = {
      providers: stacks.map((stack) => this.toSerializableStack(stack)),
    };

    this.notifyWebview(webview, {
      type: "providerPicker:open",
      payload,
    });
  }

  private handleProviderPickerMessage(
    message: ProviderPickerMessage,
    webview: Webview
  ): void {
    if (message.type === "providerPicker:cancel") {
      window.showInformationMessage("Session creation cancelled.");
      return;
    }

    const providerIds = this.sanitizeProviderIds(
      message.payload?.providerIds ?? []
    );
    if (providerIds.length === 0) {
      window.showWarningMessage(
        "Select at least one provider to start a session."
      );
      return;
    }

    const result = this.sessionLauncher.launch({ providerIds });
    if (result.status === "error") {
      window.showWarningMessage(result.summary);
      return;
    }

    this.broadcastSessionCreated(result, webview);
    window.showInformationMessage(result.summary);
  }

  private toSerializableStack(
    stack: ProviderStackDescriptor
  ): ProviderStackDescriptor {
    return {
      id: stack.id,
      title: stack.title,
      description: stack.description,
      connected: stack.connected,
    };
  }

  private sanitizeProviderIds(
    providerIds: readonly unknown[]
  ): ProviderStackId[] {
    const knownStacks = this.providerRegistry
      .listStacks()
      .map((stack) => stack.id);
    const knownSet = new Set<ProviderStackId>(knownStacks);
    const sanitized: ProviderStackId[] = [];

    for (const identifier of providerIds) {
      if (typeof identifier !== "string") {
        continue;
      }

      const candidate = identifier as ProviderStackId;
      if (!knownSet.has(candidate)) {
        continue;
      }

      sanitized.push(candidate);
    }

    return sanitized;
  }

  private notifyWebview(
    webview: Webview,
    message: Record<string, unknown>
  ): void {
    webview.postMessage(message);
  }

  private broadcastSessionCreated(
    result: Extract<SessionLaunchResult, { status: "ok" }>,
    webview: Webview
  ): void {
    const session = this.toSerializableSession(result.session);
    this.notifyWebview(webview, {
      type: "session:created",
      payload: session,
    });
  }

  private toSerializableSession(session: SessionRecord): SessionRecord {
    return {
      id: session.id,
      title: session.title,
      providerIds: [...session.providerIds],
      createdAt: session.createdAt,
    };
  }
}

import { type Webview, window } from "vscode";

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

export type WebviewMessage = CommandMessage | LayoutMessage | GenericMessage;

export class HomeViewMessageRouter {
  handleMessage(message: WebviewMessage, _webview: Webview): void {
    if (this.isCommandMessage(message)) {
      this.handleCommand(message.command);
      return;
    }

    if (this.isLayoutMessage(message)) {
      this.toLayoutBounds(message.payload);
    }
  }

  private handleCommand(command: WebviewCommand): void {
    switch (command) {
      case "newSession":
        window.showInformationMessage(
          "New session flow will be connected in a later phase."
        );
        break;
      case "lastSession":
        window.showInformationMessage(
          "Last session restore is not yet available."
        );
        break;
      case "clearSession":
        window.showInformationMessage("Clearing sessions will be added soon.");
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
}

import type { Webview } from "vscode";
import { ProviderRegistry } from "../core/providers/provider-registry";
import { SessionLauncher } from "../core/session/session-launcher";
import { handleCommand } from "./home-view-message-router/command-handler";
import { validateLayoutPayload } from "./home-view-message-router/layout-utils";
import {
  isCommandMessage,
  isLayoutMessage,
  isProviderPickerMessage,
  type WebviewMessage,
} from "./home-view-message-router/message-types";
import { handleProviderPickerMessage } from "./home-view-message-router/provider-picker-handler";
import {
  type SettingsMessage,
  SettingsMessageHandler,
} from "./message-handlers/settings-message-handler";

type Notifier = (message: Record<string, unknown>) => void;

type CommandContext = {
  readonly providerRegistry: ProviderRegistry;
  readonly notifyWebview: Notifier;
};

type ProviderPickerContext = {
  readonly providerRegistry: ProviderRegistry;
  readonly sessionLauncher: SessionLauncher;
  readonly notifyWebview: Notifier;
};

export class HomeViewMessageRouter {
  private readonly providerRegistry: ProviderRegistry;
  private readonly sessionLauncher: SessionLauncher;
  private readonly settingsHandler: SettingsMessageHandler;

  constructor(
    providerRegistry: ProviderRegistry = new ProviderRegistry(),
    sessionLauncher: SessionLauncher = new SessionLauncher(),
    settingsHandler: SettingsMessageHandler = new SettingsMessageHandler()
  ) {
    this.providerRegistry = providerRegistry;
    this.sessionLauncher = sessionLauncher;
    this.settingsHandler = settingsHandler;
  }

  handleMessage(message: WebviewMessage, webview: Webview): void {
    const notify: Notifier = (payload) => this.notifyWebview(webview, payload);

    if (isCommandMessage(message)) {
      const context: CommandContext = {
        providerRegistry: this.providerRegistry,
        notifyWebview: notify,
      };
      handleCommand(message.command, context);
      return;
    }

    if (isProviderPickerMessage(message)) {
      const context: ProviderPickerContext = {
        providerRegistry: this.providerRegistry,
        sessionLauncher: this.sessionLauncher,
        notifyWebview: notify,
      };
      handleProviderPickerMessage(message, context);
      return;
    }

    if (this.canHandleSettingsMessage(message)) {
      this.settingsHandler.handle(message, webview);
      return;
    }

    if (isLayoutMessage(message)) {
      validateLayoutPayload(message.payload);
    }
  }

  private notifyWebview(
    webview: Webview,
    message: Record<string, unknown>
  ): void {
    webview.postMessage(message);
  }

  private canHandleSettingsMessage(
    message: WebviewMessage
  ): message is SettingsMessage {
    return this.settingsHandler.canHandle(message);
  }
}

export type { WebviewMessage } from "./home-view-message-router/message-types";

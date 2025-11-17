import type { Webview } from "vscode";
import { window } from "vscode";
import { ProviderRegistry } from "../core/providers/provider-registry";
import { SessionLauncher } from "../core/session/session-launcher";
import type { CoreProcessManager } from "./core/core-process-manager";
import { FileOperationsFacade } from "./file-operations/file-operations-facade";
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
  readonly fileOperations: FileOperationsFacade;
  readonly coreProcessManager?: CoreProcessManager;
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
  private readonly fileOperations: FileOperationsFacade;
  private readonly coreProcessManager?: CoreProcessManager;

  constructor(coreProcessManager?: CoreProcessManager) {
    this.providerRegistry = new ProviderRegistry();
    this.sessionLauncher = new SessionLauncher();
    this.settingsHandler = new SettingsMessageHandler();
    this.fileOperations = new FileOperationsFacade();
    this.coreProcessManager = coreProcessManager;
  }

  handleMessage(message: WebviewMessage, webview: Webview): void {
    const notify: Notifier = (payload) => this.notifyWebview(webview, payload);

    // Handle core restart request
    if (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      message.type === "core:restart-request"
    ) {
      this.handleCoreRestartRequest();
      return;
    }

    if (isCommandMessage(message)) {
      const context: CommandContext = {
        providerRegistry: this.providerRegistry,
        notifyWebview: notify,
        fileOperations: this.fileOperations,
        coreProcessManager: this.coreProcessManager,
      };
      handleCommand(message.command, context).catch((error) => {
        const reason =
          error instanceof Error ? error.message : "Unknown error.";
        window.showErrorMessage(`Command handling failed: ${reason}`);
      });
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

  private handleCoreRestartRequest(): void {
    if (!this.coreProcessManager) {
      return;
    }

    this.coreProcessManager
      .ensureStarted(undefined, { forceRestart: true })
      .catch((error) => {
        const reason = error instanceof Error ? error.message : String(error);
        window.showErrorMessage(`Failed to restart core: ${reason}`);
      });
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

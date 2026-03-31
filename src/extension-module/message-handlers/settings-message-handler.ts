import { type Webview, window } from "vscode";
import { syncCodexProviderReasoningSummaryConfig } from "../settings/codex-provider-config-sync";
import { ProviderVersionService } from "../settings/provider-version-service";
import {
  applyDefaultModelsEnv,
  loadSettingsSnapshot,
  parseSettingsSnapshot,
  persistSettingsSnapshot,
} from "../settings/settings-storage";
import {
  DEFAULT_SETTINGS_SNAPSHOT,
  type SettingsSnapshot,
} from "../settings/types";

export type SettingsMessage =
  | { type: "settings:load" }
  | { type: "settings:codex-reasoning-summary-preview"; enabled?: unknown }
  | { type: "settings:save"; settings?: unknown }
  | { type: "settings:reset" }
  | {
      type: "settings:update-provider";
      provider: "claude" | "codex" | "gemini";
      target: "cli" | "sdk" | "core";
    }
  | { type: "settings:closed" };

const STATUS_MESSAGE_TIMEOUT = 2000;
export class SettingsMessageHandler {
  private settingsState: SettingsSnapshot = loadSettingsSnapshot();
  private readonly versionService: ProviderVersionService;

  constructor(_extensionPath: string) {
    this.versionService = new ProviderVersionService();
    applyDefaultModelsEnv(this.settingsState);
  }

  canHandle(message: unknown): message is SettingsMessage {
    if (!message || typeof message !== "object") {
      return false;
    }

    const candidate = message as { type?: string };

    return (
      candidate.type === "settings:load" ||
      candidate.type === "settings:codex-reasoning-summary-preview" ||
      candidate.type === "settings:save" ||
      candidate.type === "settings:reset" ||
      candidate.type === "settings:update-provider" ||
      candidate.type === "settings:closed"
    );
  }

  handle(message: SettingsMessage, webview: Webview): void {
    switch (message.type) {
      case "settings:load": {
        this.postSettings(webview);
        this.postProviderVersions(webview).catch(() => {
          /* noop */
        });
        break;
      }
      case "settings:save": {
        const nextSettings = parseSettingsSnapshot(message.settings);
        if (!nextSettings) {
          window.showWarningMessage(
            "Received invalid settings payload. Changes were not saved."
          );
          return;
        }
        this.settingsState = nextSettings;
        applyDefaultModelsEnv(this.settingsState);
        persistSettingsSnapshot(this.settingsState).catch(() => {
          /* ignore persistence errors */
        });
        syncCodexProviderReasoningSummaryConfig(
          this.settingsState.providers.codex.reasoningSummaryEnabled
        ).catch(() => {
          /* ignore sync errors */
        });
        this.postSavedNotification(webview);
        window.showInformationMessage("Settings saved (stub implementation).");
        break;
      }
      case "settings:codex-reasoning-summary-preview": {
        syncCodexProviderReasoningSummaryConfig(
          message.enabled !== false
        ).catch(() => {
          /* ignore sync errors */
        });
        break;
      }
      case "settings:reset": {
        this.settingsState = DEFAULT_SETTINGS_SNAPSHOT;
        applyDefaultModelsEnv(this.settingsState);
        persistSettingsSnapshot(this.settingsState).catch(() => {
          /* ignore persistence errors */
        });
        syncCodexProviderReasoningSummaryConfig(
          this.settingsState.providers.codex.reasoningSummaryEnabled
        ).catch(() => {
          /* ignore sync errors */
        });
        this.postSettings(webview);
        window.showInformationMessage("Settings reset to defaults.");
        break;
      }
      case "settings:update-provider": {
        this.handleUpdateRequest(
          message.provider,
          message.target,
          webview
        ).catch(() => {
          /* errors handled inside handleUpdateRequest */
        });
        break;
      }
      case "settings:closed": {
        window.setStatusBarMessage("Settings closed.", STATUS_MESSAGE_TIMEOUT);
        break;
      }
      default:
        break;
    }
  }

  private postSettings(webview: Webview): void {
    Promise.resolve(
      webview.postMessage({
        type: "settings:loaded",
        settings: this.settingsState,
      })
    ).catch(() => {
      /* noop */
    });
  }

  private async postProviderVersions(webview: Webview): Promise<void> {
    try {
      const versions = await this.versionService.loadSnapshot();
      await webview.postMessage({
        type: "settings:versions",
        versions,
      });
    } catch (error) {
      await webview.postMessage({
        type: "settings:versions",
        error: this.describeError(error),
      });
    }
  }

  private async handleUpdateRequest(
    provider: "claude" | "codex" | "gemini",
    target: "cli" | "sdk" | "core",
    webview: Webview
  ): Promise<void> {
    if (
      (provider !== "claude" &&
        provider !== "codex" &&
        provider !== "gemini") ||
      (target !== "cli" && target !== "sdk" && target !== "core")
    ) {
      return;
    }
    try {
      const snapshot = await this.versionService.updateTarget(provider, target);
      await webview.postMessage({
        type: "settings:versions",
        versions: snapshot,
      });
      window.showInformationMessage(
        `Updated ${provider} ${target} to the latest global version.`
      );
    } catch (error) {
      window.showErrorMessage(
        `Failed to update ${provider} ${target}: ${this.describeError(error)}`
      );
      await this.postProviderVersions(webview);
    }
  }

  private postSavedNotification(webview: Webview): void {
    Promise.resolve(
      webview.postMessage({
        type: "settings:saved",
        settings: this.settingsState,
      })
    ).catch(() => {
      /* noop */
    });
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

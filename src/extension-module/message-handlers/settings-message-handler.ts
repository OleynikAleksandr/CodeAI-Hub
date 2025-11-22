import { type Webview, window } from "vscode";
import {
  loadClaudeThinkingSettings,
  persistClaudeThinkingSettings,
} from "../settings/claude-thinking-storage";
import { ProviderVersionService } from "../settings/provider-version-service";
import {
  DEFAULT_SETTINGS_SNAPSHOT,
  type SettingsSnapshot,
} from "../settings/types";

export type SettingsMessage =
  | { type: "settings:load" }
  | { type: "settings:save"; settings?: unknown }
  | { type: "settings:reset" }
  | {
    type: "settings:update-provider";
    provider: "claude" | "codex";
    target: "cli" | "sdk";
  }
  | { type: "settings:closed" };

const STATUS_MESSAGE_TIMEOUT = 2000;
const MIN_SETTINGS_TOKENS = 2000;
const MAX_SETTINGS_TOKENS = 32_000;

export class SettingsMessageHandler {
  private settingsState: SettingsSnapshot = loadClaudeThinkingSettings();
  private readonly versionService: ProviderVersionService;

  constructor(extensionPath: string) {
    this.versionService = new ProviderVersionService(extensionPath);
  }

  canHandle(message: unknown): message is SettingsMessage {
    if (!message || typeof message !== "object") {
      return false;
    }

    const candidate = message as { type?: string };

    return (
      candidate.type === "settings:load" ||
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
        const nextSettings = this.parseSettingsCandidate(message.settings);
        if (!nextSettings) {
          window.showWarningMessage(
            "Received invalid settings payload. Changes were not saved."
          );
          return;
        }
        this.settingsState = nextSettings;
        persistClaudeThinkingSettings(this.settingsState).catch(() => {
          /* ignore persistence errors */
        });
        this.postSavedNotification(webview);
        window.showInformationMessage("Settings saved (stub implementation).");
        break;
      }
      case "settings:reset": {
        this.settingsState = DEFAULT_SETTINGS_SNAPSHOT;
        persistClaudeThinkingSettings(this.settingsState).catch(() => {
          /* ignore persistence errors */
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
    provider: "claude" | "codex",
    target: "cli" | "sdk",
    webview: Webview
  ): Promise<void> {
    if (
      (provider !== "claude" && provider !== "codex") ||
      (target !== "cli" && target !== "sdk")
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

  private parseSettingsCandidate(value: unknown): SettingsSnapshot | null {
    if (!value || typeof value !== "object") {
      return null;
    }

    const candidate = value as Record<string, unknown>;
    const thinking = candidate.thinking as Record<string, unknown> | undefined;

    if (
      !thinking ||
      typeof thinking.enabled !== "boolean" ||
      typeof thinking.maxTokens !== "number"
    ) {
      return null;
    }

    const boundedTokens = Math.min(
      MAX_SETTINGS_TOKENS,
      Math.max(MIN_SETTINGS_TOKENS, thinking.maxTokens)
    );

    return {
      thinking: {
        enabled: thinking.enabled,
        maxTokens: boundedTokens,
      },
    };
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

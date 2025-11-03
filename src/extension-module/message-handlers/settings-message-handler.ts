import { type Webview, window } from "vscode";
import {
  loadClaudeThinkingSettings,
  persistClaudeThinkingSettings,
} from "../settings/claude-thinking-storage";
import {
  DEFAULT_SETTINGS_SNAPSHOT,
  type SettingsSnapshot,
} from "../settings/types";

export type SettingsMessage =
  | { type: "settings:load" }
  | { type: "settings:save"; settings?: unknown }
  | { type: "settings:reset" }
  | { type: "settings:closed" };

const STATUS_MESSAGE_TIMEOUT = 2000;
const MIN_SETTINGS_TOKENS = 2000;
const MAX_SETTINGS_TOKENS = 32_000;

export class SettingsMessageHandler {
  private settingsState: SettingsSnapshot = loadClaudeThinkingSettings();

  canHandle(message: unknown): message is SettingsMessage {
    if (!message || typeof message !== "object") {
      return false;
    }

    const candidate = message as { type?: string };

    return (
      candidate.type === "settings:load" ||
      candidate.type === "settings:save" ||
      candidate.type === "settings:reset" ||
      candidate.type === "settings:closed"
    );
  }

  handle(message: SettingsMessage, webview: Webview): void {
    switch (message.type) {
      case "settings:load": {
        this.postSettings(webview);
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
}

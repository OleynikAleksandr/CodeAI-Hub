import { type Webview, window, workspace } from "vscode";
import { syncCodexProviderReasoningSummaryConfig } from "../settings/codex-provider-config-sync";
import {
  createExtensionLocalizationFacade,
  createExtensionUserGlossaryStore,
  LocalizationRuntimeService,
} from "../settings/localization-runtime-service";
import {
  type LocalizationSelectiveSyncPlan,
  LocalizationSelectiveSyncPlanner,
} from "../settings/localization-selective-sync-planner";
import { LocalizationSettingsImpactClassifier } from "../settings/localization-settings-impact-classifier";
import { ProviderVersionService } from "../settings/provider-version-service";
import {
  applyDefaultModelsEnv,
  loadSettingsSnapshot,
  parseSettingsSnapshot,
  persistSettingsSnapshot,
} from "../settings/settings-storage";
import {
  DEFAULT_SETTINGS_SNAPSHOT,
  type SettingsEnvelopePayload,
  type SettingsSnapshot,
} from "../settings/types";

export type SettingsMessage =
  | { type: "settings:load" }
  | { type: "settings:codex-reasoning-summary-preview"; enabled?: unknown }
  | { type: "settings:open-user-glossary-file" }
  | { type: "settings:save"; settings?: unknown }
  | { type: "settings:reset" }
  | {
      type: "settings:update-provider";
      provider: "claude" | "codex";
      target: "cli" | "sdk" | "core";
    }
  | { type: "settings:closed" };

const STATUS_MESSAGE_TIMEOUT = 2000;

const resolveActiveWorkspaceRoot = (): string | null =>
  workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;

const syncCodexProviderConfigForActiveWorkspace = (
  enabled: boolean
): Promise<void> =>
  syncCodexProviderReasoningSummaryConfig(enabled, {
    workspaceRoot: resolveActiveWorkspaceRoot(),
  });

export class SettingsMessageHandler {
  private settingsState: SettingsSnapshot = loadSettingsSnapshot();
  private readonly localizationRuntimeService: LocalizationRuntimeService;
  private readonly impactClassifier: LocalizationSettingsImpactClassifier;
  private readonly selectiveSyncPlanner: LocalizationSelectiveSyncPlanner;
  private readonly versionService: ProviderVersionService;

  constructor(_extensionPath: string) {
    this.localizationRuntimeService = new LocalizationRuntimeService(
      createExtensionLocalizationFacade(resolveActiveWorkspaceRoot())
    );
    this.impactClassifier = new LocalizationSettingsImpactClassifier();
    this.selectiveSyncPlanner = new LocalizationSelectiveSyncPlanner();
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
      candidate.type === "settings:open-user-glossary-file" ||
      candidate.type === "settings:save" ||
      candidate.type === "settings:reset" ||
      candidate.type === "settings:update-provider" ||
      candidate.type === "settings:closed"
    );
  }

  handle(message: SettingsMessage, webview: Webview): void {
    switch (message.type) {
      case "settings:load": {
        this.postSettings(webview).catch(() => {
          /* noop */
        });
        this.postProviderVersions(webview).catch(() => {
          /* noop */
        });
        break;
      }
      case "settings:save": {
        this.handleSaveRequest(message.settings, webview).catch(() => {
          /* noop */
        });
        break;
      }
      case "settings:codex-reasoning-summary-preview": {
        syncCodexProviderConfigForActiveWorkspace(
          message.enabled !== false
        ).catch(() => {
          /* ignore sync errors */
        });
        break;
      }
      case "settings:open-user-glossary-file": {
        this.handleOpenUserGlossaryFile().catch(() => {
          /* errors handled inside handleOpenUserGlossaryFile */
        });
        break;
      }
      case "settings:reset": {
        this.settingsState = structuredClone(DEFAULT_SETTINGS_SNAPSHOT);
        applyDefaultModelsEnv(this.settingsState);
        persistSettingsSnapshot(this.settingsState).catch(() => {
          /* ignore persistence errors */
        });
        syncCodexProviderConfigForActiveWorkspace(
          this.settingsState.providers.codex.reasoningSummaryEnabled
        ).catch(() => {
          /* ignore sync errors */
        });
        this.postSettings(webview).catch(() => {
          /* noop */
        });
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

  private async postSettings(webview: Webview): Promise<void> {
    this.settingsState = loadSettingsSnapshot();
    applyDefaultModelsEnv(this.settingsState);
    await webview.postMessage({
      type: "settings:loaded",
      localizationRuntime: null,
      settings: this.settingsState,
    });
    const localizationRuntime =
      await this.localizationRuntimeService.resolveRuntimePayload(
        this.settingsState
      );
    await webview.postMessage({
      type: "settings:loaded",
      localizationRuntime,
      settings: this.settingsState,
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
    target: "cli" | "sdk" | "core",
    webview: Webview
  ): Promise<void> {
    if (
      (provider !== "claude" && provider !== "codex") ||
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

  private async postSavedNotification(
    webview: Webview,
    payload: SettingsEnvelopePayload
  ): Promise<void> {
    await webview.postMessage({
      type: "settings:saved",
      ...payload,
    });
  }

  private async postSaveError(webview: Webview, error: string): Promise<void> {
    await webview.postMessage({
      type: "settings:save-error",
      error,
    });
  }

  private async postLocalizationSyncStatus(
    webview: Webview,
    payload: {
      readonly busy: boolean;
      readonly message: string;
    }
  ): Promise<void> {
    await webview.postMessage({
      type: "settings:localization-sync-status",
      ...payload,
    });
  }

  private async handleSaveRequest(
    rawSettings: unknown,
    webview: Webview
  ): Promise<void> {
    const nextSettings = parseSettingsSnapshot(rawSettings);
    if (!nextSettings) {
      const reason =
        "Received invalid settings payload. Changes were not saved.";
      window.showWarningMessage(reason);
      await this.postSaveError(webview, reason);
      return;
    }

    const previousSnapshot = this.settingsState;
    const impact = this.impactClassifier.classify(
      previousSnapshot,
      nextSettings
    );

    this.settingsState = nextSettings;
    applyDefaultModelsEnv(this.settingsState);

    const plan = this.selectiveSyncPlanner.plan(impact, this.settingsState);

    try {
      if (impact.kind === "none") {
        await this.persistAndSyncCodexConfig();
        await this.postSavedNotification(
          webview,
          await this.resolveEnvelopePayload()
        );
        return;
      }

      await this.runStrictLocalizationSync(webview, plan);
    } catch (error) {
      const reason = this.describeError(error);
      window.showErrorMessage(
        `Failed to synchronize localization settings: ${reason}`
      );
      await this.postSaveError(webview, reason);
      if (impact.kind !== "none") {
        await this.postLocalizationSyncStatus(webview, {
          busy: false,
          message: `Localization sync failed: ${reason}`,
        });
      }
    }
  }

  private async runStrictLocalizationSync(
    webview: Webview,
    plan: LocalizationSelectiveSyncPlan
  ): Promise<void> {
    await this.postLocalizationSyncStatus(webview, {
      busy: true,
      message:
        "Localization sync is running. Project Manager and new sessions stay blocked until translated interface bundles are ready.",
    });
    await this.persistAndSyncCodexConfig();
    await this.postSavedNotification(
      webview,
      await this.resolveEnvelopePayload("strict", plan)
    );
    await this.postLocalizationSyncStatus(webview, {
      busy: false,
      message: "Localization sync completed.",
    });
  }

  private async persistAndSyncCodexConfig(): Promise<void> {
    await persistSettingsSnapshot(this.settingsState);
    syncCodexProviderConfigForActiveWorkspace(
      this.settingsState.providers.codex.reasoningSummaryEnabled
    ).catch(() => {
      /* ignore sync errors */
    });
  }

  private async handleOpenUserGlossaryFile(): Promise<void> {
    try {
      const glossaryFilePath = await createExtensionUserGlossaryStore(
        resolveActiveWorkspaceRoot()
      ).ensureEditableGlossaryFile();
      const document = await workspace.openTextDocument(glossaryFilePath);
      await window.showTextDocument(document, {
        preview: false,
        preserveFocus: false,
      });
    } catch (error) {
      window.showErrorMessage(
        `Failed to open the do-not-translate glossary file: ${this.describeError(error)}`
      );
    }
  }

  private async resolveEnvelopePayload(
    mode: "best_effort" | "strict" = "best_effort",
    plan?: LocalizationSelectiveSyncPlan
  ): Promise<SettingsEnvelopePayload> {
    return {
      localizationRuntime:
        mode === "strict"
          ? await this.localizationRuntimeService.synchronizeRuntimePayload(
              this.settingsState,
              plan
                ? { affectedRuntimeBundleIds: plan.affectedRuntimeBundleIds }
                : undefined
            )
          : await this.localizationRuntimeService.resolveRuntimePayload(
              this.settingsState
            ),
      settings: this.settingsState,
    };
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

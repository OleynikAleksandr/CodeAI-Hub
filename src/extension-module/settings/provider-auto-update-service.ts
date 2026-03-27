import {
  type Progress,
  ProgressLocation,
  type ProgressOptions,
  window,
} from "vscode";
import { getExtensionLogger } from "../logging/extension-logger";
import type {
  ProviderVersionsSnapshot,
  VersionEntry,
} from "./provider-version-model";
import { installGlobalPackageLatest } from "./provider-version-npm";
import { ProviderVersionService } from "./provider-version-service";
import type { SettingsSnapshot } from "./types";

interface UpdateAction {
  readonly label: string;
  readonly run: () => Promise<void>;
}

type ProgressReporter = Progress<{ message?: string; increment?: number }>;

interface ProviderAutoUpdateSettings {
  readonly claude: boolean;
  readonly codex: boolean;
  readonly gemini: boolean;
}

const resolveAutoUpdateSettings = (
  settings: SettingsSnapshot
): ProviderAutoUpdateSettings => ({
  claude: settings.providers.claude.autoUpdate.enabled,
  codex: settings.providers.codex.autoUpdate.enabled,
  gemini: settings.providers.gemini.autoUpdate.enabled,
});

const shouldUpdateEntry = (entry: VersionEntry): boolean => {
  if (!entry.latestVersion) {
    return false;
  }
  return entry.currentVersion !== entry.latestVersion;
};

const describeVersionChange = (entry: VersionEntry): string => {
  const current = entry.currentVersion ?? "not installed";
  const latest = entry.latestVersion ?? "unknown";
  return `${current} → ${latest}`;
};

const describeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export class ProviderAutoUpdateService {
  private readonly versionService: ProviderVersionService;
  private readonly logger = getExtensionLogger();

  constructor() {
    this.versionService = new ProviderVersionService();
  }

  async run(settings: SettingsSnapshot): Promise<void> {
    const autoUpdateSettings = resolveAutoUpdateSettings(settings);
    if (!this.hasEnabledProviders(autoUpdateSettings)) {
      this.logger.info("provider-auto-update:skipped", {
        reason: "all-disabled",
      });
      return;
    }

    const progressOptions: ProgressOptions = {
      location: ProgressLocation.Notification,
      title: "Checking provider updates",
    };

    await window.withProgress(progressOptions, async (progress) => {
      await this.runWithProgress(progress, autoUpdateSettings);
    });
  }

  private async runWithProgress(
    progress: ProgressReporter,
    autoUpdateSettings: ProviderAutoUpdateSettings
  ): Promise<void> {
    progress.report({ message: "Reading installed versions..." });

    let snapshot: ProviderVersionsSnapshot;
    try {
      snapshot = await this.versionService.loadSnapshot();
    } catch (error) {
      this.logger.warn("provider-auto-update:loadSnapshot:error", {
        error: describeError(error),
      });
      progress.report({ message: "Provider update check failed." });
      return;
    }

    const actions = this.buildUpdateActions(snapshot, autoUpdateSettings);
    if (actions.length === 0) {
      progress.report({ message: "All provider tools are up to date." });
      return;
    }

    for (const action of actions) {
      progress.report({ message: action.label });
      try {
        await action.run();
      } catch (error) {
        this.logger.warn("provider-auto-update:update:error", {
          action: action.label,
          error: describeError(error),
        });
      }
    }

    progress.report({ message: "Provider updates complete." });
  }

  private buildUpdateActions(
    snapshot: ProviderVersionsSnapshot,
    autoUpdateSettings: ProviderAutoUpdateSettings
  ): UpdateAction[] {
    const actions: UpdateAction[] = [];

    if (autoUpdateSettings.claude) {
      this.addPackageUpdate(
        actions,
        "Updating Claude CLI",
        snapshot.claude.cli
      );
      this.addPackageUpdate(
        actions,
        "Updating Claude SDK",
        snapshot.claude.sdk
      );
    }

    if (autoUpdateSettings.codex) {
      this.addPackageUpdate(actions, "Updating Codex CLI", snapshot.codex.cli);
      this.addPackageUpdate(actions, "Updating Codex SDK", snapshot.codex.sdk);
    }

    if (
      autoUpdateSettings.gemini &&
      (shouldUpdateEntry(snapshot.gemini.cli) ||
        shouldUpdateEntry(snapshot.gemini.core))
    ) {
      actions.push({
        label: `Updating Gemini CLI/Core (${describeVersionChange(
          snapshot.gemini.cli
        )})`,
        run: async () => {
          await this.versionService.updateTarget("gemini", "cli");
        },
      });
    }

    return actions;
  }

  private addPackageUpdate(
    actions: UpdateAction[],
    labelPrefix: string,
    entry: VersionEntry
  ): void {
    if (!shouldUpdateEntry(entry)) {
      return;
    }

    actions.push({
      label: `${labelPrefix} (${describeVersionChange(entry)})`,
      run: async () => {
        await installGlobalPackageLatest(entry.packageName);
      },
    });
  }

  private hasEnabledProviders(
    autoUpdateSettings: ProviderAutoUpdateSettings
  ): boolean {
    return (
      autoUpdateSettings.claude ||
      autoUpdateSettings.codex ||
      autoUpdateSettings.gemini
    );
  }
}

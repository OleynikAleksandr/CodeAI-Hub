import { readFile } from "node:fs/promises";
import type { CoreConfig } from "../../config";
import { providerSettingsSnapshotCache } from "../../config/json-file-snapshot-cache";
import type { Logger } from "../../telemetry/logger";
import {
  buildDefaultSettingsSnapshot,
  type LocalizationComparisonSnapshot,
  normalizeLoadedSettingsSnapshotWithDefaults,
  persistSettingsSnapshot,
  resolveLocalizationComparisonSnapshot,
  resolveSettingsSnapshotPath,
  type SettingsLoadEntry,
  type WorkspaceSettingsScope,
} from "./settings-persistence-snapshot";

type ApprovedLocalizationGroupId =
  | "artifacts_for_the_user"
  | "messages_for_the_user"
  | "ui_helper_text"
  | "ui_labels";

type LocalizationImpactKind = "categories" | "engine" | "none";

export type LocalizationRuntimeBundleId =
  | "interactive_templates"
  | "system_feedback"
  | "ui_interface"
  | "user_guidance"
  | "workflow_terms";

const APPROVED_GROUP_TO_RUNTIME_BUNDLES: Readonly<
  Record<ApprovedLocalizationGroupId, readonly LocalizationRuntimeBundleId[]>
> = {
  artifacts_for_the_user: ["interactive_templates"],
  messages_for_the_user: ["system_feedback"],
  ui_helper_text: ["user_guidance"],
  ui_labels: ["ui_interface", "workflow_terms"],
};

const DEFAULT_LOCALIZATION_LANGUAGE = "en";

interface LocalizationImpact {
  readonly changedGroups: readonly ApprovedLocalizationGroupId[];
  readonly kind: LocalizationImpactKind;
}

export interface SettingsWriteResult {
  readonly affectedRuntimeBundleIds: readonly LocalizationRuntimeBundleId[];
  readonly settings: Record<string, unknown>;
  readonly syncMode: "best_effort" | "strict";
}

export interface SettingsPersistenceOptions {
  readonly workspace?: WorkspaceSettingsScope;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const resolveErrorCode = (error: unknown): string | null => {
  if (!isRecord(error)) {
    return null;
  }
  const code = error.code;
  return typeof code === "string" ? code : null;
};

const resolveLocalizationImpact = (
  previousSettings: Record<string, unknown>,
  nextSettings: Record<string, unknown>
): LocalizationImpact => {
  const previous = resolveLocalizationComparisonSnapshot(previousSettings);
  const next = resolveLocalizationComparisonSnapshot(nextSettings);

  if (
    previous.engineId !== next.engineId ||
    previous.glossaryEnabled !== next.glossaryEnabled
  ) {
    return { changedGroups: [], kind: "engine" };
  }

  const changedGroups: ApprovedLocalizationGroupId[] = [];
  if (previous.uiLabels !== next.uiLabels) {
    changedGroups.push("ui_labels");
  }
  if (previous.uiHelperText !== next.uiHelperText) {
    changedGroups.push("ui_helper_text");
  }
  if (previous.messagesForTheUser !== next.messagesForTheUser) {
    changedGroups.push("messages_for_the_user");
  }
  if (previous.artifactsForTheUser !== next.artifactsForTheUser) {
    changedGroups.push("artifacts_for_the_user");
  }

  return changedGroups.length > 0
    ? { changedGroups, kind: "categories" }
    : { changedGroups: [], kind: "none" };
};

const resolveLanguageForGroup = (
  group: ApprovedLocalizationGroupId,
  snapshot: LocalizationComparisonSnapshot
): string => {
  if (group === "ui_labels") {
    return snapshot.uiLabels;
  }
  if (group === "ui_helper_text") {
    return snapshot.uiHelperText;
  }
  if (group === "messages_for_the_user") {
    return snapshot.messagesForTheUser;
  }
  return snapshot.artifactsForTheUser;
};

const planSelectiveSync = (
  impact: LocalizationImpact,
  nextSettings: Record<string, unknown>
): readonly LocalizationRuntimeBundleId[] => {
  if (impact.kind === "none") {
    return [];
  }

  const next = resolveLocalizationComparisonSnapshot(nextSettings);
  if (impact.kind === "engine") {
    const affectedBundles: LocalizationRuntimeBundleId[] = [];
    for (const [group, bundles] of Object.entries(
      APPROVED_GROUP_TO_RUNTIME_BUNDLES
    ) as [
      ApprovedLocalizationGroupId,
      readonly LocalizationRuntimeBundleId[],
    ][]) {
      const language = resolveLanguageForGroup(group, next);
      if (language.trim().toLowerCase() === DEFAULT_LOCALIZATION_LANGUAGE) {
        continue;
      }
      affectedBundles.push(...bundles);
    }
    return affectedBundles;
  }

  const affectedBundles: LocalizationRuntimeBundleId[] = [];
  for (const group of impact.changedGroups) {
    affectedBundles.push(...APPROVED_GROUP_TO_RUNTIME_BUNDLES[group]);
  }
  return affectedBundles;
};

export class SettingsPersistenceService {
  private readonly config: CoreConfig;
  private readonly logger: Logger;

  constructor(options: {
    readonly config: CoreConfig;
    readonly logger: Logger;
  }) {
    this.config = options.config;
    this.logger = options.logger;
    this.primeDefaultsIfMissing().catch((error: unknown) => {
      this.logger.warn("Failed to prime default settings on startup", {
        error: toErrorMessage(error),
        settingsPath: this.config.claudeSettingsPath,
      });
    });
  }

  async load(
    options: SettingsPersistenceOptions = {}
  ): Promise<Record<string, unknown>> {
    return (await this.loadSettingsEntry(options)).settings;
  }

  async reset(
    options: SettingsPersistenceOptions = {}
  ): Promise<SettingsWriteResult> {
    const settingsPath = this.resolveSettingsPath(options);
    const current = await this.loadSettingsEntry(options);
    const settings = buildDefaultSettingsSnapshot(this.config);
    await persistSettingsSnapshot(settingsPath, settings);
    this.invalidateSettingsSnapshotCache(settingsPath);

    const impact = resolveLocalizationImpact(current.settings, settings);
    return {
      affectedRuntimeBundleIds: planSelectiveSync(impact, settings),
      settings,
      syncMode: impact.kind === "none" ? "best_effort" : "strict",
    };
  }

  async save(
    rawSettings: unknown,
    options: SettingsPersistenceOptions = {}
  ): Promise<SettingsWriteResult> {
    if (!this.isValidSettingsPayload(rawSettings)) {
      throw new Error(
        "Received invalid settings payload. Changes were not saved."
      );
    }

    const settingsPath = this.resolveSettingsPath(options);
    const current = await this.loadSettingsEntry(options);
    const { settings } = normalizeLoadedSettingsSnapshotWithDefaults(
      rawSettings,
      this.config
    );
    await persistSettingsSnapshot(settingsPath, settings);
    this.invalidateSettingsSnapshotCache(settingsPath);

    const impact = resolveLocalizationImpact(current.settings, settings);
    return {
      affectedRuntimeBundleIds: planSelectiveSync(impact, settings),
      settings,
      syncMode: impact.kind === "none" ? "best_effort" : "strict",
    };
  }

  private isValidSettingsPayload(value: unknown): value is Record<
    string,
    unknown
  > & {
    readonly general: Record<string, unknown>;
    readonly providers: Record<string, unknown>;
  } {
    return (
      isRecord(value) && isRecord(value.general) && isRecord(value.providers)
    );
  }

  private async primeDefaultsIfMissing(): Promise<void> {
    const settingsPath = this.config.claudeSettingsPath;
    try {
      await readFile(settingsPath, "utf8");
    } catch (error: unknown) {
      const code = resolveErrorCode(error);
      if (code !== "ENOENT") {
        return;
      }
      try {
        await persistSettingsSnapshot(
          settingsPath,
          buildDefaultSettingsSnapshot(this.config)
        );
        this.invalidateSettingsSnapshotCache(settingsPath);
      } catch (persistError) {
        this.logger.warn("Failed to persist default settings on startup", {
          error: toErrorMessage(persistError),
          settingsPath,
        });
      }
    }
  }

  private resolveSettingsPath(options: SettingsPersistenceOptions): string {
    return resolveSettingsSnapshotPath({
      config: this.config,
      workspace: options.workspace,
    });
  }

  private async loadSettingsEntry(
    options: SettingsPersistenceOptions = {}
  ): Promise<SettingsLoadEntry> {
    const settingsPath = this.resolveSettingsPath(options);
    try {
      const raw = await readFile(settingsPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      const baseSettings = isRecord(parsed)
        ? parsed
        : buildDefaultSettingsSnapshot(this.config);
      const normalized = normalizeLoadedSettingsSnapshotWithDefaults(
        baseSettings,
        this.config
      );

      if (normalized.changed) {
        try {
          await persistSettingsSnapshot(settingsPath, normalized.settings);
          this.invalidateSettingsSnapshotCache(settingsPath);
        } catch (persistError) {
          this.logger.warn("Failed to persist settings migration", {
            error: toErrorMessage(persistError),
            settingsPath,
          });
        }
      }

      return normalized;
    } catch (error: unknown) {
      const code = resolveErrorCode(error);
      const message = toErrorMessage(error);
      this.logger.warn("Failed to load settings", {
        error: code ? `${code}: ${message}` : message,
        settingsPath,
      });

      const snapshot = await this.resolveMissingSettingsSnapshot(options);
      if (code === "ENOENT") {
        try {
          await persistSettingsSnapshot(settingsPath, snapshot);
          this.invalidateSettingsSnapshotCache(settingsPath);
        } catch (persistError) {
          this.logger.warn("Failed to persist default settings", {
            error: toErrorMessage(persistError),
            settingsPath,
          });
        }
      }

      return { changed: code === "ENOENT", settings: snapshot };
    }
  }

  private async resolveMissingSettingsSnapshot(
    options: SettingsPersistenceOptions
  ): Promise<Record<string, unknown>> {
    if (!options.workspace) {
      return buildDefaultSettingsSnapshot(this.config);
    }

    try {
      const raw = await readFile(this.config.claudeSettingsPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      const baseSettings = isRecord(parsed)
        ? parsed
        : buildDefaultSettingsSnapshot(this.config);
      return normalizeLoadedSettingsSnapshotWithDefaults(
        baseSettings,
        this.config
      ).settings;
    } catch {
      return buildDefaultSettingsSnapshot(this.config);
    }
  }

  private invalidateSettingsSnapshotCache(settingsPath: string): void {
    providerSettingsSnapshotCache.clear(settingsPath);
  }
}

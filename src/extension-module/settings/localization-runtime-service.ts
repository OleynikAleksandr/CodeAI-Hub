import {
  LocalizationFacade,
  type LocalizationRuntimeBootstrapSnapshot,
  type LocalizationRuntimePayload,
  type LocalizationRuntimeSettingsSnapshot,
  type LocalizationSelectiveSyncOptions,
} from "@codeai-hub/localization";
import { getDefaultCoreConnectionInfo } from "../core/core-connection-info";
import type { SettingsSnapshot } from "./types";

const CORE_ONLY_MATERIALIZATION_ENGINE_IDS = new Set<string>([
  "anthropic-claude-haiku-4-5",
]);
const LOCALIZATION_BOOTSTRAP_PATH = "/api/v1/localization/bootstrap";

const matchesRuntimeSettings = (
  left: LocalizationRuntimeSettingsSnapshot,
  right: LocalizationRuntimeSettingsSnapshot
): boolean =>
  left.defaultLanguage === right.defaultLanguage &&
  left.engineId === right.engineId &&
  left.workflowTermsPolicy === right.workflowTermsPolicy &&
  JSON.stringify(left.categories) === JSON.stringify(right.categories);

export class LocalizationRuntimeService {
  private readonly localizationFacade: LocalizationFacade;
  private readonly resolveCoreHttpUrl: () => string | null;

  constructor(
    localizationFacade = new LocalizationFacade(),
    resolveCoreHttpUrl: () => string | null = () =>
      getDefaultCoreConnectionInfo().httpUrl
  ) {
    this.localizationFacade = localizationFacade;
    this.resolveCoreHttpUrl = resolveCoreHttpUrl;
  }

  async resolveRuntimePayload(
    settings: SettingsSnapshot
  ): Promise<LocalizationRuntimePayload> {
    const snapshot = this.createRuntimeSnapshot(settings);
    if (CORE_ONLY_MATERIALIZATION_ENGINE_IDS.has(snapshot.engineId)) {
      const coreBootstrap = await this.fetchCoreBootstrapSnapshot(snapshot);
      if (coreBootstrap) {
        return coreBootstrap.runtimePayload;
      }
    }
    return this.localizationFacade.resolveRuntimePayload(snapshot);
  }

  async synchronizeRuntimePayload(
    settings: SettingsSnapshot,
    options?: LocalizationSelectiveSyncOptions
  ): Promise<LocalizationRuntimePayload> {
    const snapshot = this.createRuntimeSnapshot(settings);
    if (CORE_ONLY_MATERIALIZATION_ENGINE_IDS.has(snapshot.engineId)) {
      const coreBootstrap = await this.fetchCoreBootstrapSnapshot(snapshot, {
        strict: true,
      });
      if (!coreBootstrap) {
        throw new Error(
          `Core-backed localization bootstrap is unavailable for ${snapshot.engineId}.`
        );
      }
      return coreBootstrap.runtimePayload;
    }
    return this.localizationFacade.synchronizeRuntimePayload(snapshot, options);
  }

  async loadRuntimeBootstrapSnapshot(
    settings: SettingsSnapshot
  ): Promise<LocalizationRuntimeBootstrapSnapshot | null> {
    const snapshot = this.createRuntimeSnapshot(settings);
    if (CORE_ONLY_MATERIALIZATION_ENGINE_IDS.has(snapshot.engineId)) {
      return await this.fetchCoreBootstrapSnapshot(snapshot);
    }
    return this.localizationFacade.loadRuntimeBootstrapSnapshot(snapshot);
  }

  private createRuntimeSnapshot(
    settings: SettingsSnapshot
  ): LocalizationRuntimeSettingsSnapshot {
    const { localization } = settings.general;

    return {
      categories: {
        artifacts_for_the_user: localization.categories.artifactsForTheUser,
        interactive_templates: localization.categories.artifactsForTheUser,
        messages_for_the_user: localization.categories.messagesForTheUser,
        system_feedback: localization.categories.messagesForTheUser,
        ui_helper_text: localization.categories.uiHelperText,
        ui_interface: localization.categories.uiLabels,
        ui_labels: localization.categories.uiLabels,
        user_guidance: localization.categories.uiHelperText,
        workflow_terms: localization.categories.uiLabels,
      } as LocalizationRuntimeSettingsSnapshot["categories"],
      defaultLanguage: localization.defaultLanguage,
      engineId: localization.engineId,
      workflowTermsPolicy: localization.workflowTermsPolicy,
    };
  }

  private async fetchCoreBootstrapSnapshot(
    runtimeSettings: LocalizationRuntimeSettingsSnapshot,
    options?: { readonly strict?: boolean }
  ): Promise<LocalizationRuntimeBootstrapSnapshot | null> {
    const httpUrl = this.resolveCoreHttpUrl();
    if (!httpUrl) {
      if (options?.strict) {
        throw new Error("Core HTTP bridge is unavailable.");
      }
      return null;
    }

    let response: Response;
    try {
      response = await fetch(`${httpUrl}${LOCALIZATION_BOOTSTRAP_PATH}`);
    } catch (error) {
      if (options?.strict) {
        throw new Error(
          `Failed to fetch Core localization bootstrap: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      return null;
    }

    if (!response.ok) {
      if (options?.strict) {
        throw new Error(
          `Core localization bootstrap request failed with HTTP ${response.status}.`
        );
      }
      return null;
    }

    const snapshot =
      (await response.json()) as LocalizationRuntimeBootstrapSnapshot;
    if (!matchesRuntimeSettings(snapshot.settings, runtimeSettings)) {
      if (options?.strict) {
        throw new Error(
          "Core localization bootstrap does not match the current settings snapshot."
        );
      }
      return null;
    }
    return snapshot;
  }
}

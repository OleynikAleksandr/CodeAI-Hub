import path from "node:path";
import {
  LocalizationFacade,
  type LocalizationRuntimeBootstrapSnapshot,
  type LocalizationRuntimePayload,
  type LocalizationRuntimeSettingsSnapshot,
  type LocalizationSelectiveSyncOptions,
  UserGlossaryStore,
} from "@codeai-hub/localization";
import { getDefaultCoreConnectionInfo } from "../core/core-connection-info";
import {
  createLocalizationRuntimeSettingsSnapshot,
  matchesLocalizationRuntimeSettingsSnapshot,
} from "./localization-runtime-settings-snapshot";
import type { SettingsSnapshot } from "./types";

const CORE_ONLY_MATERIALIZATION_ENGINE_IDS = new Set<string>([
  "anthropic-claude-haiku-4-5",
]);
const LOCALIZATION_BOOTSTRAP_PATH = "/api/v1/localization/bootstrap";
const WORKSPACE_FALLBACK_SLUG = "workspace";

const normalizeWorkspaceRuntimeSlug = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
  const parts = normalized.match(/[a-z0-9]+/gu);
  return parts?.join("-") || WORKSPACE_FALLBACK_SLUG;
};

const resolveWorkspaceRoot = (workspaceRoot?: string | null): string =>
  path.resolve(workspaceRoot?.trim() || process.cwd());

const resolveExtensionLocalizationRootDirectory = (
  workspaceRoot?: string | null,
  workspaceSlug?: string | null
): string => {
  const root = resolveWorkspaceRoot(workspaceRoot);
  const slug = normalizeWorkspaceRuntimeSlug(
    workspaceSlug?.trim() || path.basename(root)
  );
  return path.join(root, ".codeai-hub", slug, "runtime", "localization");
};

export const createExtensionLocalizationFacade = (
  workspaceRoot?: string | null,
  workspaceSlug?: string | null
): LocalizationFacade =>
  new LocalizationFacade({
    localizationRootDirectory: resolveExtensionLocalizationRootDirectory(
      workspaceRoot,
      workspaceSlug
    ),
  });

export const createExtensionUserGlossaryStore = (
  workspaceRoot?: string | null,
  workspaceSlug?: string | null
): UserGlossaryStore =>
  new UserGlossaryStore({
    glossaryDirectory: path.join(
      resolveExtensionLocalizationRootDirectory(workspaceRoot, workspaceSlug),
      "glossary"
    ),
  });

export class LocalizationRuntimeService {
  private readonly localizationFacade: LocalizationFacade;
  private readonly resolveCoreHttpUrl: () => string | null;

  constructor(
    localizationFacade = createExtensionLocalizationFacade(),
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

  private createRuntimeSnapshot(settings: SettingsSnapshot) {
    return createLocalizationRuntimeSettingsSnapshot(settings);
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
    if (
      !matchesLocalizationRuntimeSettingsSnapshot(
        snapshot.settings,
        runtimeSettings
      )
    ) {
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

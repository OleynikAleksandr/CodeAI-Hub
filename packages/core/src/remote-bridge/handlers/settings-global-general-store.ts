import { readFile } from "node:fs/promises";
import type { CoreConfig } from "../../config";
import {
  buildDefaultSettingsSnapshot,
  normalizeLoadedSettingsSnapshotWithDefaults,
} from "./settings-persistence-snapshot";

export interface CombinedSettingsSnapshot {
  readonly changed: boolean;
  readonly globalHadGeneral: boolean;
  readonly settings: Record<string, unknown>;
  readonly workspaceHadGeneral: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.hasOwn(value, key);

const GLOBAL_CONNECTION_PROVIDER_IDS = ["glmNative", "openRouter"] as const;

const readProviderSettings = (
  settings: Record<string, unknown> | null,
  providerId: string
): Record<string, unknown> | null => {
  const providers = isRecord(settings?.providers) ? settings.providers : null;
  const provider = providers?.[providerId];
  return isRecord(provider) ? provider : null;
};

const pickProviderConnection = (
  provider: Record<string, unknown> | null
): Record<string, unknown> => {
  const connection: Record<string, unknown> = {};
  if (!provider) {
    return connection;
  }
  for (const key of ["apiKey", "baseUrl"]) {
    if (hasOwn(provider, key) && typeof provider[key] === "string") {
      connection[key] = provider[key];
    }
  }
  return connection;
};

const shouldPromoteWorkspaceConnection = (
  globalProvider: Record<string, unknown> | null,
  workspaceProvider: Record<string, unknown> | null
): boolean => {
  if (!workspaceProvider) {
    return false;
  }
  return ["apiKey", "baseUrl"].some(
    (key) =>
      !(globalProvider && hasOwn(globalProvider, key)) &&
      typeof workspaceProvider[key] === "string" &&
      workspaceProvider[key].trim().length > 0
  );
};

const mergeGlobalProviders = (options: {
  readonly globalSettings: Record<string, unknown> | null;
  readonly workspaceSettings: Record<string, unknown>;
}): {
  readonly changed: boolean;
  readonly providers: Record<string, unknown> | undefined;
} => {
  const workspaceProviders = isRecord(options.workspaceSettings.providers)
    ? options.workspaceSettings.providers
    : null;
  let changed = false;
  let providers = workspaceProviders ? { ...workspaceProviders } : undefined;

  for (const providerId of GLOBAL_CONNECTION_PROVIDER_IDS) {
    const workspaceProvider = readProviderSettings(
      options.workspaceSettings,
      providerId
    );
    const globalProvider = readProviderSettings(
      options.globalSettings,
      providerId
    );
    const globalConnection = pickProviderConnection(globalProvider);
    const promoteWorkspaceConnection = shouldPromoteWorkspaceConnection(
      globalProvider,
      workspaceProvider
    );
    if (
      Object.keys(globalConnection).length === 0 &&
      !promoteWorkspaceConnection
    ) {
      continue;
    }
    changed = changed || promoteWorkspaceConnection;
    providers = {
      ...(providers ?? {}),
      [providerId]: {
        ...(workspaceProvider ?? {}),
        ...globalConnection,
      },
    };
  }

  if (!providers) {
    return { changed: false, providers: workspaceProviders ?? undefined };
  }
  return { changed, providers };
};

export const readJsonObjectFile = async (
  filePath: string
): Promise<Record<string, unknown> | null> => {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return isRecord(parsed) ? parsed : null;
};

export const combineGlobalGeneralWithWorkspaceSettings = (options: {
  readonly config: CoreConfig;
  readonly globalSettings: Record<string, unknown> | null;
  readonly workspaceSettings: Record<string, unknown>;
}): CombinedSettingsSnapshot => {
  const defaultSettings = buildDefaultSettingsSnapshot(options.config);
  const workspaceGeneral = isRecord(options.workspaceSettings.general)
    ? options.workspaceSettings.general
    : null;
  const globalGeneral =
    options.globalSettings && isRecord(options.globalSettings.general)
      ? options.globalSettings.general
      : null;
  const mergedProviders = mergeGlobalProviders(options);
  const baseSettings = {
    ...options.workspaceSettings,
    ...(mergedProviders.providers
      ? { providers: mergedProviders.providers }
      : {}),
    general:
      globalGeneral ??
      workspaceGeneral ??
      (defaultSettings.general as Record<string, unknown>),
  };
  const normalized = normalizeLoadedSettingsSnapshotWithDefaults(
    baseSettings,
    options.config
  );
  return {
    changed: normalized.changed || mergedProviders.changed,
    globalHadGeneral: Boolean(globalGeneral),
    settings: normalized.settings,
    workspaceHadGeneral: Boolean(workspaceGeneral),
  };
};

export const toGlobalGeneralSettingsSnapshot = (
  settings: Record<string, unknown>
): Record<string, unknown> => {
  const providers = Object.fromEntries(
    GLOBAL_CONNECTION_PROVIDER_IDS.map((providerId) => [
      providerId,
      pickProviderConnection(readProviderSettings(settings, providerId)),
    ]).filter(([, connection]) => Object.keys(connection).length > 0)
  );
  return {
    general: isRecord(settings.general) ? settings.general : {},
    ...(Object.keys(providers).length > 0 ? { providers } : {}),
  };
};

export const toWorkspaceSettingsSnapshot = (
  settings: Record<string, unknown>
): Record<string, unknown> => {
  const { general: _general, ...workspaceSettings } = settings;
  const providers = isRecord(workspaceSettings.providers)
    ? workspaceSettings.providers
    : null;
  if (!providers) {
    return workspaceSettings;
  }
  const nextProviders = { ...providers };
  for (const providerId of GLOBAL_CONNECTION_PROVIDER_IDS) {
    const provider = readProviderSettings(settings, providerId);
    if (!provider) {
      continue;
    }
    const {
      apiKey: _apiKey,
      baseUrl: _baseUrl,
      ...workspaceProvider
    } = provider;
    nextProviders[providerId] = workspaceProvider;
  }
  return {
    ...workspaceSettings,
    providers: nextProviders,
  };
};

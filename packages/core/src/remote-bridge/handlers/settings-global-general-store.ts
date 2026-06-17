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

const readProviderSettings = (
  settings: Record<string, unknown> | null,
  providerId: string
): Record<string, unknown> | null => {
  const providers = isRecord(settings?.providers) ? settings.providers : null;
  const provider = providers?.[providerId];
  return isRecord(provider) ? provider : null;
};

const pickGlmNativeConnection = (
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

const shouldPromoteWorkspaceGlmConnection = (
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
  const workspaceGlmNative = readProviderSettings(
    options.workspaceSettings,
    "glmNative"
  );
  const globalGlmNative = readProviderSettings(
    options.globalSettings,
    "glmNative"
  );
  const globalConnection = pickGlmNativeConnection(globalGlmNative);
  if (
    Object.keys(globalConnection).length === 0 &&
    !shouldPromoteWorkspaceGlmConnection(globalGlmNative, workspaceGlmNative)
  ) {
    return { changed: false, providers: workspaceProviders ?? undefined };
  }
  return {
    changed: shouldPromoteWorkspaceGlmConnection(
      globalGlmNative,
      workspaceGlmNative
    ),
    providers: {
      ...(workspaceProviders ?? {}),
      glmNative: {
        ...(workspaceGlmNative ?? {}),
        ...globalConnection,
      },
    },
  };
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
  const glmNative = readProviderSettings(settings, "glmNative");
  const glmConnection = pickGlmNativeConnection(glmNative);
  return {
    general: isRecord(settings.general) ? settings.general : {},
    ...(Object.keys(glmConnection).length > 0
      ? { providers: { glmNative: glmConnection } }
      : {}),
  };
};

export const toWorkspaceSettingsSnapshot = (
  settings: Record<string, unknown>
): Record<string, unknown> => {
  const { general: _general, ...workspaceSettings } = settings;
  const providers = isRecord(workspaceSettings.providers)
    ? workspaceSettings.providers
    : null;
  const glmNative = readProviderSettings(settings, "glmNative");
  if (!(providers && glmNative)) {
    return workspaceSettings;
  }
  const {
    apiKey: _apiKey,
    baseUrl: _baseUrl,
    ...workspaceGlmNative
  } = glmNative;
  return {
    ...workspaceSettings,
    providers: { ...providers, glmNative: workspaceGlmNative },
  };
};

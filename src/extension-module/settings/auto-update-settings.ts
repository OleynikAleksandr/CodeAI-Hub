import { isRecord, resolveBoolean } from "./settings-utils";

export interface AutoUpdateSettings {
  readonly enabled: boolean;
}

export const DEFAULT_AUTO_UPDATE_SETTINGS: AutoUpdateSettings = {
  enabled: true,
};

export const normalizeAutoUpdateSettings = (
  value: unknown
): AutoUpdateSettings => {
  if (!isRecord(value)) {
    return DEFAULT_AUTO_UPDATE_SETTINGS;
  }

  return {
    enabled: resolveBoolean(
      value.enabled,
      DEFAULT_AUTO_UPDATE_SETTINGS.enabled
    ),
  };
};

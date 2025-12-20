import { isRecord, resolveBoolean } from "./settings-utils";

export type GeneralSettings = {
  readonly coreControls: {
    readonly allowRestart: boolean;
  };
};

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  coreControls: {
    allowRestart: true,
  },
};

export const normalizeGeneralSettings = (value: unknown): GeneralSettings => {
  if (!isRecord(value)) {
    return DEFAULT_GENERAL_SETTINGS;
  }

  const coreControls = isRecord(value.coreControls) ? value.coreControls : {};

  return {
    coreControls: {
      allowRestart: resolveBoolean(
        coreControls.allowRestart,
        DEFAULT_GENERAL_SETTINGS.coreControls.allowRestart
      ),
    },
  };
};

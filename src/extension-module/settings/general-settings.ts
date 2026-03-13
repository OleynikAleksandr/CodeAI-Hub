import {
  createDefaultGeneralResponsePolicy,
  normalizeGeneralResponsePolicy,
} from "./general-response-mode/general-response-mode-facade";
import type { GeneralResponsePolicySettings } from "./general-response-mode/response-mode-settings";
import { isRecord, resolveBoolean } from "./settings-utils";

export type GeneralSettings = {
  readonly coreControls: {
    readonly allowRestart: boolean;
  };
  readonly responsePolicy: GeneralResponsePolicySettings;
};

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  coreControls: {
    allowRestart: true,
  },
  responsePolicy: createDefaultGeneralResponsePolicy(),
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
    responsePolicy: normalizeGeneralResponsePolicy(value.responsePolicy),
  };
};

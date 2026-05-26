import type { Request, Response } from "express";
import { loadConfig } from "../../config";
import { createCoreLocalizationFacade } from "../../translation/core-localization-facade-factory";
import { buildDefaultSettingsSnapshot } from "./settings-persistence-snapshot";
import { resolveLocalizationRuntimeSettings } from "./settings-request-handler";

const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;

export const handleLocalizationBootstrapRead = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const config = loadConfig();
    const localizationFacade = createCoreLocalizationFacade({
      config,
    });
    const runtimeSettings = resolveLocalizationRuntimeSettings(
      buildDefaultSettingsSnapshot(config)
    );
    const cachedSnapshot =
      await localizationFacade.loadRuntimeBootstrapSnapshot(runtimeSettings);
    if (cachedSnapshot) {
      res.json(cachedSnapshot);
      return;
    }

    const snapshot =
      await localizationFacade.resolveRuntimeBootstrapSnapshot(runtimeSettings);
    if (!snapshot) {
      res.status(HTTP_NOT_FOUND).json({
        error: "Localization bootstrap snapshot is unavailable",
      });
      return;
    }

    res.json(snapshot);
  } catch (error) {
    res.status(HTTP_INTERNAL_ERROR).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to read localization bootstrap snapshot",
    });
  }
};

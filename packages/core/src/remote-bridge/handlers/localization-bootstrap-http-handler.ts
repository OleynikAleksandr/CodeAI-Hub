import { readFile } from "node:fs/promises";
import type { Request, Response } from "express";
import { loadConfig } from "../../config";
import { createCoreLocalizationFacade } from "../../translation/core-localization-facade-factory";
import { resolveLocalizationRuntimeSettings } from "./settings-request-handler";

const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;
const DEFAULT_RUNTIME_SETTINGS_SOURCE: Record<string, unknown> = {};

export const handleLocalizationBootstrapRead = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const config = loadConfig();
    const localizationFacade = createCoreLocalizationFacade({
      config,
    });
    const rawSettings = await readFile(config.claudeSettingsPath, "utf8").catch(
      (error: unknown) => {
        if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
          return null;
        }
        throw error;
      }
    );
    const parsedSettings =
      rawSettings && rawSettings.trim().length > 0
        ? (JSON.parse(rawSettings) as unknown)
        : DEFAULT_RUNTIME_SETTINGS_SOURCE;
    const settings =
      typeof parsedSettings === "object" &&
      parsedSettings !== null &&
      !Array.isArray(parsedSettings)
        ? (parsedSettings as Record<string, unknown>)
        : DEFAULT_RUNTIME_SETTINGS_SOURCE;
    const runtimeSettings = resolveLocalizationRuntimeSettings(settings);
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

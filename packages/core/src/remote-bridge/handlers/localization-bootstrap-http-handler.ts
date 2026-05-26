import type { Request, Response } from "express";
import { type CoreConfig, loadConfig } from "../../config";
import { Logger } from "../../telemetry/logger";
import { createCoreLocalizationFacade } from "../../translation/core-localization-facade-factory";
import { SettingsPersistenceService } from "./settings-persistence-service";
import type { WorkspaceSettingsScope } from "./settings-persistence-snapshot";
import { resolveLocalizationRuntimeSettings } from "./settings-request-handler";

const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;

const resolveWorkspaceSettingsScope = (
  config: CoreConfig
): WorkspaceSettingsScope => ({
  workspaceRoot: config.claudeWorkspacePath ?? process.cwd(),
  workspaceSlug: config.claudeProjectSlug,
});

const loadWorkspaceSettings = (
  config: CoreConfig
): Promise<Record<string, unknown>> =>
  new SettingsPersistenceService({
    config,
    logger: new Logger(),
  }).load({ workspace: resolveWorkspaceSettingsScope(config) });

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
      await loadWorkspaceSettings(config)
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

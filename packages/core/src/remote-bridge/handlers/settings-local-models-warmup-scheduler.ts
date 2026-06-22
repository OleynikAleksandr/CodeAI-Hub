import type { CoreConfig } from "../../config";
import { warmSelectedLocalModels } from "../../local-models/local-models-warmup-service";
import type { Logger } from "../../telemetry/logger";
import {
  resolveSettingsSnapshotPath,
  type WorkspaceSettingsScope,
} from "./settings-persistence-snapshot";

export type LocalModelsWarmupRunner = (options: {
  readonly reporter?: Logger;
  readonly settingsPath: string;
}) => unknown;

export type LocalModelsWarmupScheduler = (callback: () => void) => void;

export const scheduleSettingsLocalModelsWarmup = (options: {
  readonly config: CoreConfig;
  readonly logger: Logger;
  readonly scheduleLocalModelsWarmup?: LocalModelsWarmupScheduler;
  readonly warmSelectedLocalModels?: LocalModelsWarmupRunner;
  readonly workspace?: WorkspaceSettingsScope;
}): void => {
  const settingsPath = resolveSettingsSnapshotPath({
    config: options.config,
    workspace: options.workspace,
  });
  const schedule =
    options.scheduleLocalModelsWarmup ??
    ((callback: () => void) => {
      setTimeout(callback, 0);
    });
  const warm = options.warmSelectedLocalModels ?? warmSelectedLocalModels;

  schedule(() => {
    try {
      warm({
        reporter: options.logger,
        settingsPath,
      });
    } catch (error) {
      options.logger.warn("LM Studio warmup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
};

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
  const baseSettings = {
    ...options.workspaceSettings,
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
    changed: normalized.changed,
    globalHadGeneral: Boolean(globalGeneral),
    settings: normalized.settings,
    workspaceHadGeneral: Boolean(workspaceGeneral),
  };
};

export const toGlobalGeneralSettingsSnapshot = (
  settings: Record<string, unknown>
): Record<string, unknown> => ({
  general: isRecord(settings.general) ? settings.general : {},
});

export const toWorkspaceSettingsSnapshot = (
  settings: Record<string, unknown>
): Record<string, unknown> => {
  const { general: _general, ...workspaceSettings } = settings;
  return workspaceSettings;
};

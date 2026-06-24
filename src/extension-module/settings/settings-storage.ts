import { homedir } from "node:os";
import path from "node:path";
import { normalizeClaudeSettings } from "./claude-settings";
import { normalizeCodexSettings } from "./codex-settings";
import { normalizeGeneralSettings } from "./general-settings";
import { isRecord } from "./settings-utils";
import { DEFAULT_SETTINGS_SNAPSHOT, type SettingsSnapshot } from "./types";

const SETTINGS_DIR = path.join(homedir(), ".codeai-hub", "settings");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");

export const parseSettingsSnapshot = (
  value: unknown
): SettingsSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (!(isRecord(value.providers) && isRecord(value.general))) {
    return null;
  }

  const providers = value.providers;
  return {
    general: normalizeGeneralSettings(value.general),
    providers: {
      claude: normalizeClaudeSettings(providers.claude),
      codex: normalizeCodexSettings(providers.codex),
    },
  };
};

export const loadSettingsSnapshot = (): SettingsSnapshot => {
  return structuredClone(DEFAULT_SETTINGS_SNAPSHOT);
};

export const persistSettingsSnapshot = async (
  _snapshot?: SettingsSnapshot
): Promise<void> => {
  // Project Manager/Core own runtime settings persistence per workspace.
  // The extension-side settings surface is compatibility-only and must not
  // resurrect ~/.codeai-hub/settings/settings.json as mutable runtime truth.
};

export const applyDefaultModelsEnv = (_snapshot: SettingsSnapshot): void => {
  if (process.env.CLAUDE_SETTINGS_PATH === SETTINGS_FILE) {
    Reflect.deleteProperty(process.env, "CLAUDE_SETTINGS_PATH");
  }
};

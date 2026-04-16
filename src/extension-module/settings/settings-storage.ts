import { existsSync, promises as fs, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { getExtensionLogger } from "../logging/extension-logger";
import {
  type ClaudeThinkingSettings,
  DEFAULT_CLAUDE_SETTINGS,
  normalizeClaudeSettings,
  normalizeClaudeThinkingSettings,
} from "./claude-settings";
import { normalizeCodexSettings } from "./codex-settings";
import { normalizeGeminiSettings } from "./gemini-settings";
import { normalizeGeneralSettings } from "./general-settings";
import { isRecord } from "./settings-utils";
import { DEFAULT_SETTINGS_SNAPSHOT, type SettingsSnapshot } from "./types";

const SETTINGS_DIR = path.join(homedir(), ".codeai-hub", "settings");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");
const LEGACY_CLAUDE_SETTINGS_FILE = path.join(SETTINGS_DIR, "claude.json");

interface LegacyClaudeSettingsFile {
  readonly thinking?: unknown;
}

const normalizeSnapshotForStorage = (
  value: unknown
): SettingsSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }

  const providers = isRecord(value.providers) ? value.providers : {};
  const general = isRecord(value.general) ? value.general : {};

  return {
    general: normalizeGeneralSettings(general),
    providers: {
      claude: normalizeClaudeSettings(providers.claude),
      codex: normalizeCodexSettings(providers.codex),
      gemini: normalizeGeminiSettings(providers.gemini),
    },
  };
};

const needsThinkingDisplayBackfill = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  const providers = isRecord(value.providers) ? value.providers : {};
  const claude = isRecord(providers.claude) ? providers.claude : {};
  const gemini = isRecord(providers.gemini) ? providers.gemini : {};

  return (
    typeof claude.thinkingDisplaySyncEnabled !== "boolean" ||
    typeof gemini.thinkingDisplaySyncEnabled !== "boolean"
  );
};

const needsClaudeThinkingEffortBackfill = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  const providers = isRecord(value.providers) ? value.providers : {};
  const claude = isRecord(providers.claude) ? providers.claude : {};
  const thinking = isRecord(claude.thinking) ? claude.thinking : null;
  if (!thinking) {
    return false;
  }

  return (
    typeof thinking.effort !== "string" ||
    Object.getOwnPropertyDescriptor(thinking, "maxTokens") !== undefined
  );
};

const needsLocalizationBackfill = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  const general = isRecord(value.general) ? value.general : {};
  const rawLocalization = isRecord(general.localization)
    ? general.localization
    : null;
  const normalizedLocalization = normalizeGeneralSettings(general).localization;

  return (
    JSON.stringify(rawLocalization) !== JSON.stringify(normalizedLocalization)
  );
};

const extractLegacyClaudeThinking = (): ClaudeThinkingSettings | null => {
  try {
    const raw = readFileSync(LEGACY_CLAUDE_SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw) as LegacyClaudeSettingsFile;
    if (!(parsed && isRecord(parsed) && isRecord(parsed.thinking))) {
      return null;
    }
    return normalizeClaudeThinkingSettings(parsed.thinking);
  } catch {
    return null;
  }
};

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
      gemini: normalizeGeminiSettings(providers.gemini),
    },
  };
};

export const loadSettingsSnapshot = (): SettingsSnapshot => {
  const hadSettingsFile = existsSync(SETTINGS_FILE);
  try {
    const raw = readFileSync(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeSnapshotForStorage(parsed);
    if (normalized) {
      const backfillReasons = {
        thinkingDisplay: needsThinkingDisplayBackfill(parsed),
        claudeEffort: needsClaudeThinkingEffortBackfill(parsed),
        localization: needsLocalizationBackfill(parsed),
      };
      const rawEffort = (
        parsed as {
          readonly providers?: {
            readonly claude?: {
              readonly thinking?: { readonly effort?: unknown };
            };
          };
        }
      )?.providers?.claude?.thinking?.effort;
      const normalizedEffort = normalized.providers?.claude?.thinking?.effort;
      // DEBUG 1.2.0: identify which backfill path triggers a persist.
      // Written to ~/.codeai-hub/logs/extension/extension.log.
      // Remove once the stale-persist regression is fixed.
      getExtensionLogger().debug("settings_debug_load_snapshot", {
        hadSettingsFile,
        rawEffort,
        normalizedEffort,
        backfillReasons,
      });
      if (
        hadSettingsFile &&
        (backfillReasons.thinkingDisplay ||
          backfillReasons.claudeEffort ||
          backfillReasons.localization)
      ) {
        persistSettingsSnapshot(normalized).catch(() => {
          /* ignore persistence errors */
        });
      }
      return normalized;
    }
  } catch {
    // ignore missing/invalid files and fall back to defaults
  }

  const legacyThinking = extractLegacyClaudeThinking();
  if (legacyThinking) {
    const migrated: SettingsSnapshot = {
      ...DEFAULT_SETTINGS_SNAPSHOT,
      providers: {
        ...DEFAULT_SETTINGS_SNAPSHOT.providers,
        claude: {
          ...DEFAULT_CLAUDE_SETTINGS,
          thinking: legacyThinking,
        },
      },
    };
    persistSettingsSnapshot(migrated).catch(() => {
      /* ignore persistence errors */
    });
    return migrated;
  }

  if (!hadSettingsFile) {
    persistSettingsSnapshot(DEFAULT_SETTINGS_SNAPSHOT).catch(() => {
      /* ignore persistence errors */
    });
  }

  return DEFAULT_SETTINGS_SNAPSHOT;
};

export const persistSettingsSnapshot = async (
  snapshot: SettingsSnapshot
): Promise<void> => {
  const effortSnapshot = snapshot.providers?.claude?.thinking?.effort;
  const thinkingSnapshot = snapshot.providers?.claude?.thinking;
  const stack = new Error("persist trace").stack ?? "(no stack)";
  // DEBUG 1.2.0: identify who writes settings.json and with what claude thinking effort.
  // Written to ~/.codeai-hub/logs/extension/extension.log.
  // Remove this log once the stale-persist regression is fixed.
  getExtensionLogger().debug("settings_debug_persist_snapshot", {
    claudeThinking: thinkingSnapshot,
    effort: effortSnapshot,
    stack,
  });
  try {
    await fs.mkdir(SETTINGS_DIR, { recursive: true });
    await fs.writeFile(
      SETTINGS_FILE,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      "utf8"
    );
  } catch {
    // swallow persistence errors; settings UI will continue to function with in-memory state
  }
};

export const applyDefaultModelsEnv = (snapshot: SettingsSnapshot): void => {
  process.env.CLAUDE_DEFAULT_MODEL = snapshot.providers.claude.defaultModel;
  process.env.CODEX_DEFAULT_MODEL = snapshot.providers.codex.defaultModel;
  process.env.GEMINI_DEFAULT_MODEL = snapshot.providers.gemini.defaultModel;
  process.env.CLAUDE_SETTINGS_PATH = SETTINGS_FILE;
};

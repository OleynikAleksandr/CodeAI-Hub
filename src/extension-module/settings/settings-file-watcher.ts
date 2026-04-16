/**
 * DEBUG 1.2.0: polling watcher on ~/.codeai-hub/settings/settings.json.
 *
 * Every time the file mtime changes (regardless of writer), we read the
 * current claude.thinking.effort and log it via getExtensionLogger(). This
 * catches writers that bypass persistSettingsSnapshot, which the
 * persist/load trace cannot observe.
 *
 * Remove this file together with the rest of the diagnostic trace once the
 * stale-persist regression is fixed.
 */
import { readFileSync, unwatchFile, watchFile } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { getExtensionLogger } from "../logging/extension-logger";

const SETTINGS_FILE = path.join(
  homedir(),
  ".codeai-hub",
  "settings",
  "settings.json"
);

const POLL_INTERVAL_MS = 300;

let isWatching = false;

interface SettingsThinkingSnapshot {
  readonly effort?: unknown;
  readonly enabled?: unknown;
}

const readClaudeThinking = (): {
  readonly thinking: SettingsThinkingSnapshot | null;
  readonly parseError?: string;
} => {
  try {
    const raw = readFileSync(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw) as {
      readonly providers?: {
        readonly claude?: { readonly thinking?: SettingsThinkingSnapshot };
      };
    };
    return { thinking: parsed.providers?.claude?.thinking ?? null };
  } catch (error) {
    return {
      thinking: null,
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
};

export const startSettingsFileWatcher = (): void => {
  if (isWatching) {
    return;
  }
  isWatching = true;
  const initial = readClaudeThinking();
  getExtensionLogger().debug("settings_debug_watcher_start", {
    path: SETTINGS_FILE,
    initialThinking: initial.thinking,
    parseError: initial.parseError,
  });
  watchFile(
    SETTINGS_FILE,
    { interval: POLL_INTERVAL_MS, persistent: false },
    (current, previous) => {
      if (
        current.mtimeMs === previous.mtimeMs &&
        current.size === previous.size
      ) {
        return;
      }
      const snapshot = readClaudeThinking();
      getExtensionLogger().debug("settings_debug_watcher_change", {
        path: SETTINGS_FILE,
        mtimeMs: current.mtimeMs,
        prevMtimeMs: previous.mtimeMs,
        size: current.size,
        prevSize: previous.size,
        thinking: snapshot.thinking,
        parseError: snapshot.parseError,
      });
    }
  );
};

export const stopSettingsFileWatcher = (): void => {
  if (!isWatching) {
    return;
  }
  unwatchFile(SETTINGS_FILE);
  isWatching = false;
};

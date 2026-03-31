import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { CodexReasoningSummaryMode } from "./codex-provider-config-materializer";

const DEFAULT_REASONING_SUMMARY_ENABLED = true;
const SETTINGS_FILE_NAME = "settings.json";
const DEFAULT_SETTINGS_PATH = path.join(
  homedir(),
  ".codeai-hub",
  "settings",
  SETTINGS_FILE_NAME
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveSettingsPath = (): string => {
  const configuredPath = process.env.CLAUDE_SETTINGS_PATH;
  if (typeof configuredPath === "string" && configuredPath.trim().length > 0) {
    return configuredPath;
  }
  return DEFAULT_SETTINGS_PATH;
};

const resolveCodexReasoningSummaryEnabled = (): boolean => {
  try {
    const parsed = JSON.parse(
      readFileSync(resolveSettingsPath(), "utf8")
    ) as unknown;
    if (!(isRecord(parsed) && isRecord(parsed.providers))) {
      return DEFAULT_REASONING_SUMMARY_ENABLED;
    }

    const codex = parsed.providers.codex;
    if (!isRecord(codex)) {
      return DEFAULT_REASONING_SUMMARY_ENABLED;
    }

    if (typeof codex.reasoningSummaryEnabled === "boolean") {
      return codex.reasoningSummaryEnabled;
    }

    if (typeof codex.thinkingDisplaySyncEnabled === "boolean") {
      return codex.thinkingDisplaySyncEnabled;
    }

    return DEFAULT_REASONING_SUMMARY_ENABLED;
  } catch {
    return DEFAULT_REASONING_SUMMARY_ENABLED;
  }
};

export const resolveCodexReasoningSummaryMode =
  (): CodexReasoningSummaryMode =>
    resolveCodexReasoningSummaryEnabled() ? "auto" : "none";

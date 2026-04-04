import { readFileSync } from "node:fs";
import { LOCALIZATION_SOURCE_SELECTION } from "@codeai-hub/localization";

export interface CodexSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly reasoningByModel?: unknown;
}

export interface ClaudeProviderSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly sessionContinuity?: {
    readonly remainingPercentThreshold?: unknown;
  };
  readonly thinking?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
}

export interface ClaudeSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly providers?: {
    readonly claude?: {
      readonly defaultModel?: unknown;
      readonly sessionContinuity?: {
        readonly remainingPercentThreshold?: unknown;
      };
      readonly thinkingDisplaySyncEnabled?: unknown;
      readonly thinking?: unknown;
    };
  };
  readonly thinking?: unknown;
}

export interface GeminiSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
  readonly thinkingLevelByModel?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const DEFAULT_LOCALIZATION_LANGUAGE = "en";

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const normalizeLocalizationLanguage = (
  value: unknown,
  fallback: string
): string => {
  const normalized = normalizeOptionalString(value) ?? fallback;
  return normalized.toLowerCase() === LOCALIZATION_SOURCE_SELECTION
    ? DEFAULT_LOCALIZATION_LANGUAGE
    : normalized;
};

const resolveLocalizationCategory = (
  categories: Record<string, unknown>,
  candidateKeys: readonly string[],
  fallback: string
): string => {
  for (const key of candidateKeys) {
    const resolved = normalizeOptionalString(categories[key]);
    if (resolved) {
      return normalizeLocalizationLanguage(resolved, fallback);
    }
  }

  return fallback;
};

const loadJsonSnapshot = (
  settingsPath: string
): Record<string, unknown> | null => {
  try {
    const raw = readFileSync(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const loadProviderSnapshot = (
  settingsPath: string,
  providerId: string
): Record<string, unknown> | null => {
  const parsed = loadJsonSnapshot(settingsPath);
  if (!parsed) {
    return null;
  }

  const providers = isRecord(parsed.providers) ? parsed.providers : null;
  const provider =
    providers && isRecord(providers[providerId]) ? providers[providerId] : null;
  return provider;
};

export const loadCodexSettingsSnapshot = (
  settingsPath: string
): CodexSettingsSnapshot | null => {
  const codex = loadProviderSnapshot(settingsPath, "codex");
  if (!codex) {
    return null;
  }

  return {
    defaultModel: codex.defaultModel,
    reasoningByModel: codex.reasoningByModel,
  };
};

export const loadGeminiSettingsSnapshot = (
  settingsPath: string
): GeminiSettingsSnapshot | null => {
  const gemini = loadProviderSnapshot(settingsPath, "gemini");
  if (!gemini) {
    return null;
  }

  return {
    defaultModel: gemini.defaultModel,
    thinkingLevelByModel: gemini.thinkingLevelByModel,
    thinkingDisplaySyncEnabled: gemini.thinkingDisplaySyncEnabled,
  };
};

export const loadClaudeProviderSettingsSnapshot = (
  settingsPath: string
): ClaudeProviderSettingsSnapshot | null => {
  const claude = loadProviderSnapshot(settingsPath, "claude");
  if (!claude) {
    return null;
  }

  return {
    defaultModel: claude.defaultModel,
    thinking: claude.thinking,
    thinkingDisplaySyncEnabled: claude.thinkingDisplaySyncEnabled,
    sessionContinuity: isRecord(claude.sessionContinuity)
      ? {
          remainingPercentThreshold:
            claude.sessionContinuity.remainingPercentThreshold,
        }
      : undefined,
  };
};

export const loadClaudeSettingsSnapshot = (
  settingsPath: string
): ClaudeSettingsSnapshot | null => {
  const parsed = loadJsonSnapshot(settingsPath);
  return parsed ? (parsed as ClaudeSettingsSnapshot) : null;
};

export const loadMessagesForTheUserLanguage = (
  settingsPath: string
): string => {
  const parsed = loadJsonSnapshot(settingsPath);
  if (!parsed) {
    return DEFAULT_LOCALIZATION_LANGUAGE;
  }

  const general = isRecord(parsed.general) ? parsed.general : {};
  const localization = isRecord(general.localization)
    ? general.localization
    : {};
  const categories = isRecord(localization.categories)
    ? localization.categories
    : {};
  const defaultLanguage = normalizeLocalizationLanguage(
    localization.defaultLanguage,
    DEFAULT_LOCALIZATION_LANGUAGE
  );

  return resolveLocalizationCategory(
    categories,
    ["messagesForTheUser", "systemFeedback"],
    defaultLanguage
  );
};

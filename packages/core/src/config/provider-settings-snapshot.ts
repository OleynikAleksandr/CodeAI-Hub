import { readFileSync } from "node:fs";

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
}

export interface ClaudeSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly providers?: {
    readonly claude?: {
      readonly defaultModel?: unknown;
      readonly sessionContinuity?: {
        readonly remainingPercentThreshold?: unknown;
      };
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

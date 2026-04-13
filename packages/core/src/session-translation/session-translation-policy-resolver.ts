import {
  loadMessagesForTheUserLanguage,
  loadTranslationEngineId,
} from "../config/provider-settings-snapshot";

const SOURCE_LANGUAGE = "en";

export interface SessionTranslationPolicy {
  readonly enabled: boolean;
  readonly engineId: string;
  readonly sourceLanguage: "en";
  readonly targetLanguage: string | null;
}

export class SessionTranslationPolicyResolver {
  resolve(settingsPath: string): SessionTranslationPolicy {
    const targetLanguage = this.resolveTargetLanguage(settingsPath);

    return {
      enabled: targetLanguage !== null,
      engineId: loadTranslationEngineId(settingsPath),
      sourceLanguage: SOURCE_LANGUAGE,
      targetLanguage,
    };
  }

  private resolveTargetLanguage(settingsPath: string): string | null {
    const normalized = loadMessagesForTheUserLanguage(settingsPath)
      .trim()
      .toLowerCase();
    if (!(normalized && normalized.length > 0)) {
      return null;
    }
    return normalized === SOURCE_LANGUAGE ? null : normalized;
  }
}

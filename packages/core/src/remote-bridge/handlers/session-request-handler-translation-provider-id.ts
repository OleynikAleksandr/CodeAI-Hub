import type { SessionTranslationProviderId } from "../../session-translation/session-translation-facade";

const TRANSLATION_PROVIDER_IDS = new Set([
  "claude",
  "codex",
  "gemini",
  "kimi",
  "glmOpenCode",
]);

export const resolveTranslationProviderId = (
  providerId: string | undefined
): SessionTranslationProviderId | undefined => {
  if (providerId && TRANSLATION_PROVIDER_IDS.has(providerId)) {
    return providerId as SessionTranslationProviderId;
  }
  if (providerId === "kimiCode") {
    return "kimi";
  }
  return undefined;
};

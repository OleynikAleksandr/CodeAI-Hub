import { CodexCliTranslationEngine } from "./codex-cli-translation-engine";
import { GoogleTranslateClient } from "./google-translate-client";
import type { TranslationReporter } from "./translation-contract";
import type { TranslationEngine } from "./translation-engine";

export const DEFAULT_TRANSLATION_ENGINE_ID = "google-gtx";

export const createDefaultTranslationEngines = (options?: {
  readonly reporter?: TranslationReporter;
}): readonly TranslationEngine[] => {
  const reporter = options?.reporter;
  return [
    new GoogleTranslateClient({ reporter }),
    new CodexCliTranslationEngine({
      engineId: "codex-gpt-5.4-mini",
      modelId: "gpt-5.4-mini",
      reporter,
    }),
    new CodexCliTranslationEngine({
      engineId: "codex-gpt-5.3-codex-spark",
      modelId: "gpt-5.3-codex-spark",
      reporter,
    }),
  ];
};

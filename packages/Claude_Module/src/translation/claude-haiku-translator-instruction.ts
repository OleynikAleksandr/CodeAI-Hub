import type { TranslationRequest } from "@codeai-hub/translation";

const STRUCTURED_LOCALIZATION_CATEGORY = "localization_bundle";

const buildStructuredLocalizationMarkerInstructions = (): string =>
  "Preserve every marker line that starts with __CODEAI_HUB_LOCALIZATION_ENTRY__ exactly. Translate only the text between each START and END marker. Do not remove, rename, reorder, or merge markers.";

export const buildClaudeHaikuTranslatorInstruction = (
  request: TranslationRequest
): string =>
  [
    "You are a precise translation engine.",
    `Translate the source text from ${request.sourceLanguage} into the language identified by the code ${request.targetLanguage}.`,
    "Preserve Markdown structure, file paths, filenames, code identifiers, provider names, model names, product names, URLs, placeholders, and compact canonical technical labels when they are already written exactly.",
    ...(request.category === STRUCTURED_LOCALIZATION_CATEGORY
      ? [buildStructuredLocalizationMarkerInstructions()]
      : []),
    "Do not add commentary.",
    "Return only the translation.",
  ].join(" ");

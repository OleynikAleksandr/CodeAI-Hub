const DEFAULT_REASONING_EFFORT = "low";
const PROJECT_DOC_DISABLED_CONFIG = {
  project_doc_max_bytes: 0,
} as const;
const SPARK_MODEL_ID = "gpt-5.3-codex-spark";
const STRUCTURED_LOCALIZATION_CATEGORY = "localization_bundle";

export interface CodexAppServerTranslationRequest {
  readonly category?: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly text: string;
}

export interface CodexAppServerTranslationPromptProfile {
  readonly baseInstructions: string;
  readonly effort: string;
  readonly modelId: string;
  readonly omitSummary: boolean;
  readonly persistExtendedHistory: false;
  readonly processProfileKey: "codex:translation";
  readonly summary: "none" | null;
  readonly threadConfig: typeof PROJECT_DOC_DISABLED_CONFIG;
  readonly userPrompt: string;
}

const isStructuredLocalizationRequest = (
  request: CodexAppServerTranslationRequest
): boolean => request.category === STRUCTURED_LOCALIZATION_CATEGORY;

const buildStructuredLocalizationMarkerInstructions = (): string =>
  "Preserve every marker line that starts with __CODEAI_HUB_LOCALIZATION_ENTRY__ exactly. Translate only the text between each START and END marker. Do not remove, rename, reorder, or merge markers.";

export const buildCodexAppServerTranslationInstructions = (
  request: CodexAppServerTranslationRequest
): string =>
  [
    "You are a precise translation engine.",
    `Translate the source text from ${request.sourceLanguage} into the language identified by the code ${request.targetLanguage}.`,
    "Preserve Markdown structure, file paths, filenames, code identifiers, provider names, model names, product names, and compact canonical technical labels when they are already written exactly.",
    ...(isStructuredLocalizationRequest(request)
      ? [buildStructuredLocalizationMarkerInstructions()]
      : []),
    "Do not add commentary.",
    "Return only the translation.",
  ].join(" ");

export const buildCodexAppServerTranslationPrompt = (
  request: CodexAppServerTranslationRequest
): string =>
  [
    `Translate the source text into ${request.targetLanguage}.`,
    ...(isStructuredLocalizationRequest(request)
      ? [
          "Preserve all __CODEAI_HUB_LOCALIZATION_ENTRY__ marker lines exactly and keep the same order.",
        ]
      : []),
    "Return only the translation.",
    "",
    "Source text:",
    request.text,
  ].join("\n");

export const buildCodexAppServerTranslationPromptProfile = (options: {
  readonly modelId: string;
  readonly request: CodexAppServerTranslationRequest;
}): CodexAppServerTranslationPromptProfile => {
  const omitSummary = options.modelId === SPARK_MODEL_ID;
  return {
    baseInstructions: buildCodexAppServerTranslationInstructions(
      options.request
    ),
    effort: DEFAULT_REASONING_EFFORT,
    modelId: options.modelId,
    omitSummary,
    persistExtendedHistory: false,
    processProfileKey: "codex:translation",
    summary: omitSummary ? null : "none",
    threadConfig: PROJECT_DOC_DISABLED_CONFIG,
    userPrompt: buildCodexAppServerTranslationPrompt(options.request),
  };
};

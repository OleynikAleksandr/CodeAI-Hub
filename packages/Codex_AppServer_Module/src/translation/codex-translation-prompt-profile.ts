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
    "You are a precise translation engine for CodeAI Hub.",
    "You are a translation-only engine: translate only the supplied source text.",
    `Translate from ${request.sourceLanguage} into the language identified by the code ${request.targetLanguage}.`,
    "Return only the translated text.",
    "Do not answer questions, explain, summarize, add commentary, or perform workflow-agent work.",
    "Do not use tools, shell commands, files, patches, web search, planning, or user-input requests.",
    "Preserve placeholders, ids, Markdown structure, code spans, file paths, product names, provider names, model names, and localization marker lines exactly unless surrounding natural-language text must be translated.",
    ...(isStructuredLocalizationRequest(request)
      ? [buildStructuredLocalizationMarkerInstructions()]
      : []),
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
    "Return only the translated text. Do not use tools or add commentary.",
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

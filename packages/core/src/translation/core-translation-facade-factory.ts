import type { ClaudeHaikuTranslationService } from "@codeai-hub/claude-module";
import {
  createDefaultTranslationEngines,
  DEFAULT_TRANSLATION_ENGINE_ID,
  type NormalizedTranslationRequest,
  type TranslationEngine,
  TranslationFacade,
  type TranslationReporter,
  type TranslationResult,
} from "@codeai-hub/translation";
import { resolveGlobalSettingsPath } from "../config";
import {
  loadOpenRouterSettingsSnapshot,
  type OpenRouterSettingsSnapshot,
} from "../config/provider-settings-snapshot";
import { LocalModelsFacade } from "../local-models/local-models-facade";
import { ClaudeHaikuTranslationEngine } from "./claude-haiku-translation-engine";
import {
  CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID,
  CODEX_GPT_5_4_MINI_TRANSLATION_MODEL_ID,
  CODEX_SPARK_TRANSLATION_ENGINE_ID,
  CODEX_SPARK_TRANSLATION_MODEL_ID,
  CodexAppServerTranslationEngine,
} from "./codex-app-server-translation-engine";
import {
  OpenRouterTranslationGlossaryProtection,
  type ProtectedOpenRouterTranslationText,
} from "./open-router-translation-glossary-protection";

const GEMINI_FLASH_LITE_TRANSLATION_ENGINE_ID = "google/gemini-2.5-flash-lite";

export interface CoreTranslationFacadeFactoryOptions {
  readonly claudeHaikuTranslationService?: ClaudeHaikuTranslationService;
  readonly defaultEngineId?: string;
  readonly extraEngines?: readonly TranslationEngine[];
  readonly reporter?: TranslationReporter;
}

const CODEX_APP_SERVER_TRANSLATION_ENGINE_SPECS = [
  {
    engineId: CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID,
    modelId: CODEX_GPT_5_4_MINI_TRANSLATION_MODEL_ID,
  },
  {
    engineId: CODEX_SPARK_TRANSLATION_ENGINE_ID,
    modelId: CODEX_SPARK_TRANSLATION_MODEL_ID,
  },
] as const;
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const TRAILING_SLASHES_PATTERN = /\/+$/u;
const TRANSLATION_TEMPERATURE = 0.3;
const TRANSLATION_TOP_P = 0.8;

const normalizeOptionalString = (value: unknown): string | undefined => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : undefined;
};

const createFallbackResult = (
  request: NormalizedTranslationRequest,
  engineId: string,
  errorCode: string
): TranslationResult => ({
  engine: engineId,
  errorCode,
  finalText: request.text,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "fallback",
  targetLanguage: request.targetLanguage,
  translatedText: null,
});

const createTranslatedResult = (
  request: NormalizedTranslationRequest,
  engineId: string,
  translatedText: string
): TranslationResult => ({
  engine: engineId,
  finalText: translatedText,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "translated",
  targetLanguage: request.targetLanguage,
  translatedText,
});

const resolveOpenRouterApiKey = (
  snapshot: OpenRouterSettingsSnapshot | null
): string | undefined =>
  normalizeOptionalString(snapshot?.apiKey) ??
  normalizeOptionalString(process.env.OPENROUTER_API_KEY) ??
  normalizeOptionalString(process.env.CODEAI_OPENROUTER_API_KEY);

const resolveOpenRouterChatUrl = (
  snapshot: OpenRouterSettingsSnapshot | null
): string => {
  const baseUrl = normalizeOptionalString(snapshot?.baseUrl)?.replace(
    TRAILING_SLASHES_PATTERN,
    ""
  );
  return baseUrl ? `${baseUrl}/chat/completions` : OPENROUTER_CHAT_URL;
};

interface OpenRouterTranslationGlossaryProtectionContract {
  protect(text: string): Promise<ProtectedOpenRouterTranslationText>;
}

const buildProtectedTermLines = (
  protectedTerms: readonly string[]
): readonly string[] =>
  protectedTerms.length === 0
    ? []
    : [
        "Additional protected terms from the glossary are non-exhaustive and not the complete set of terms to preserve:",
        ...protectedTerms.map((term) => `- ${term}`),
        "",
      ];

const TRANSLATION_EXAMPLE_LINES = [
  "Preserve examples:",
  '- "Final_Description.md" -> "Final_Description.md"',
  '- "create_initial_draft" -> "create_initial_draft"',
  '- "FinderWidget-Test01" -> "FinderWidget-Test01"',
  '- "finder-widget-shell" -> "finder-widget-shell"',
  '- "Refresh" -> "Refresh" when it is the UI button label',
  '- "/Users/name/project/file.md" -> "/Users/name/project/file.md"',
  "",
  "Ordinary prose counterexamples:",
  '- "workflow" may be translated when it is ordinary prose.',
  '- "runtime", "boundary", "product part", and "input" may be translated when they are ordinary prose.',
  "- Preserve these words only when markers, code, UI labels, exact identifiers, file paths, commands, model IDs, provider/product/project names, or glossary markers protect them.",
  "",
] as const;

export const buildOpenRouterTranslationPrompt = (
  request: NormalizedTranslationRequest,
  protectedText: ProtectedOpenRouterTranslationText
): string =>
  [
    "Your current task is translation only.",
    `Translate the supplied English text to the language identified by code ${request.targetLanguage}.`,
    "Return only the translated text. Do not add explanations, labels, quotes, or Markdown fences unless they already exist in the source text.",
    "Translate explanatory prose only.",
    "Preserve literal identifiers exactly: product/project names, UI labels, modes, settings, commands, file names, file paths, URLs, provider names, model IDs, APIs, code identifiers, JSON keys, and glossary markers.",
    "Do not preserve ordinary explanatory words solely because they describe workflow or architecture; translate normal prose naturally.",
    "When unsure whether a phrase is a literal identifier or normal prose, preserve the English phrase unchanged.",
    "Preserve placeholders, ICU tokens, Markdown, code spans, JSON keys, file paths, API routes, CLI commands, URLs, model IDs, provider names, product names, protected technical terms, and [[CAIHUB_TERM_N]] glossary markers exactly.",
    "If the input is structured with __CODEAI_HUB_LOCALIZATION_ENTRY__ markers, keep every marker exactly unchanged and translate only the text between markers.",
    ...TRANSLATION_EXAMPLE_LINES,
    ...buildProtectedTermLines(protectedText.protectedTerms),
    "",
    "Text to translate:",
    protectedText.text,
  ].join("\n");

export class GeminiFlashLiteOpenRouterTranslationEngine
  implements TranslationEngine
{
  readonly id = GEMINI_FLASH_LITE_TRANSLATION_ENGINE_ID;
  private readonly glossaryProtection: OpenRouterTranslationGlossaryProtectionContract;
  private readonly reporter?: TranslationReporter;

  constructor(
    options: {
      readonly glossaryProtection?: OpenRouterTranslationGlossaryProtectionContract;
      readonly reporter?: TranslationReporter;
    } = {}
  ) {
    this.glossaryProtection =
      options.glossaryProtection ??
      new OpenRouterTranslationGlossaryProtection({
        reporter: options.reporter,
      });
    this.reporter = options.reporter;
  }

  async translate(
    request: NormalizedTranslationRequest
  ): Promise<TranslationResult> {
    const snapshot = loadOpenRouterSettingsSnapshot(
      resolveGlobalSettingsPath()
    );
    const apiKey = resolveOpenRouterApiKey(snapshot);
    if (!apiKey) {
      return createFallbackResult(
        request,
        this.id,
        "openrouter_api_key_missing"
      );
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const protectedText = await this.glossaryProtection.protect(request.text);
      const response = await fetch(resolveOpenRouterChatUrl(snapshot), {
        body: JSON.stringify({
          max_tokens: 2048,
          messages: [
            {
              content:
                "You are CodeAI Hub's OpenRouter localization translation engine. Return only translated text.",
              role: "system",
            },
            {
              content: buildOpenRouterTranslationPrompt(request, protectedText),
              role: "user",
            },
          ],
          model: GEMINI_FLASH_LITE_TRANSLATION_ENGINE_ID,
          reasoning: { enabled: false, exclude: true },
          reasoning_effort: "none",
          temperature: TRANSLATION_TEMPERATURE,
          top_p: TRANSLATION_TOP_P,
        }),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "CodeAI Hub Localization",
        },
        method: "POST",
        signal: controller.signal,
      });
      if (!response.ok) {
        this.reporter?.warn?.("OpenRouter translation request failed", {
          body: (await response.text()).slice(0, 500),
          engineId: this.id,
          status: response.status,
        });
        return createFallbackResult(request, this.id, "openrouter_non_ok");
      }
      const payload = (await response.json()) as {
        readonly choices?: readonly {
          readonly message?: { readonly content?: unknown };
        }[];
      };
      const translated = normalizeOptionalString(
        payload.choices?.[0]?.message?.content
      );
      return translated
        ? createTranslatedResult(
            request,
            this.id,
            protectedText.restore(translated)
          )
        : createFallbackResult(request, this.id, "openrouter_empty_response");
    } catch (error) {
      this.reporter?.warn?.("OpenRouter translation request threw", {
        engineId: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return createFallbackResult(
        request,
        this.id,
        "openrouter_request_failed"
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

const findEngine = (
  engines: readonly TranslationEngine[],
  engineId: string
): TranslationEngine | undefined =>
  engines.find((engine) => engine.id === engineId);

export const buildCoreTranslationEngines = (
  options: CoreTranslationFacadeFactoryOptions
): readonly TranslationEngine[] => {
  const reporter = options.reporter;
  const builtInEngines = createDefaultTranslationEngines({ reporter });
  const codexAppServerEngineIds = new Set<string>(
    CODEX_APP_SERVER_TRANSLATION_ENGINE_SPECS.map((spec) => spec.engineId)
  );
  const registryBuiltInEngines = builtInEngines.filter(
    (engine) => !codexAppServerEngineIds.has(engine.id)
  );
  const providerEngines: TranslationEngine[] = [];
  for (const spec of CODEX_APP_SERVER_TRANSLATION_ENGINE_SPECS) {
    providerEngines.push(
      new CodexAppServerTranslationEngine({
        engineId: spec.engineId,
        fallbackEngine: findEngine(builtInEngines, spec.engineId),
        modelId: spec.modelId,
        reporter,
      })
    );
  }
  if (options.claudeHaikuTranslationService) {
    providerEngines.push(
      new ClaudeHaikuTranslationEngine({
        reporter,
        service: options.claudeHaikuTranslationService,
      })
    );
  }
  if (options.extraEngines) {
    providerEngines.push(...options.extraEngines);
  }
  providerEngines.push(
    new GeminiFlashLiteOpenRouterTranslationEngine({ reporter })
  );
  providerEngines.push(
    ...new LocalModelsFacade({ reporter }).createTranslationEngines()
  );
  return [...registryBuiltInEngines, ...providerEngines];
};

export const createCoreTranslationFacade = (
  options: CoreTranslationFacadeFactoryOptions = {}
): TranslationFacade =>
  new TranslationFacade({
    defaultEngineId: options.defaultEngineId ?? DEFAULT_TRANSLATION_ENGINE_ID,
    engines: buildCoreTranslationEngines(options),
    reporter: options.reporter,
  });

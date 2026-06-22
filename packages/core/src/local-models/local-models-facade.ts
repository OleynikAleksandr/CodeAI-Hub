import {
  DEFAULT_ENGINE_LANGUAGE_CATALOGS,
  type LocalizationEngineLanguageCatalog,
  type LocalizationLanguageCatalogEntry,
} from "@codeai-hub/localization";
import type {
  NormalizedTranslationRequest,
  TranslationEngine,
  TranslationReporter,
  TranslationResult,
} from "@codeai-hub/translation";
import {
  createDefaultLmsCommandRunner,
  ensureLmStudioServerRunning,
  type LmsCommandRunner,
} from "./local-models-cli";
import {
  type LocalModelRuntimePurpose,
  LocalModelsRuntimeLoadManager,
} from "./local-models-runtime-load-manager";
import { readLmStudioCompletionsText } from "./local-models-sse-reader";

const DEFAULT_LM_STUDIO_BASE_URL = "http://127.0.0.1:1234";
const DISCOVERY_TIMEOUT_MS = 5000;
const DEFAULT_MAX_TOKENS = 4096;
const LM_STUDIO_JSON_HEADERS = {
  "content-type": "application/json",
} as const;
const QWEN_MODEL_PATTERN = /qwen/i;
const TRAILING_SLASHES_PATTERN = /\/+$/;
const TARGET_LANGUAGE_LABELS = new Map<string, string>([
  ["bg", "Bulgarian"],
  ["ca", "Catalan"],
  ["cs", "Czech"],
  ["da", "Danish"],
  ["de", "German"],
  ["el", "Greek"],
  ["en", "English"],
  ["es", "Spanish"],
  ["et", "Estonian"],
  ["fi", "Finnish"],
  ["fr", "French"],
  ["hr", "Croatian"],
  ["hu", "Hungarian"],
  ["it", "Italian"],
  ["lt", "Lithuanian"],
  ["lv", "Latvian"],
  ["nl", "Dutch"],
  ["no", "Norwegian"],
  ["pl", "Polish"],
  ["pt", "Portuguese"],
  ["ro", "Romanian"],
  ["ru", "Russian"],
  ["sk", "Slovak"],
  ["sl", "Slovenian"],
  ["sv", "Swedish"],
  ["tr", "Turkish"],
  ["uk", "Ukrainian"],
]);

const LM_STUDIO_TRANSLATION_ENGINE_PREFIX = "lmstudio:";

export interface LocalModelDescriptor {
  readonly architecture?: string;
  readonly displayName: string;
  readonly engineId: string;
  readonly maxContextLength?: number;
  readonly modelKey: string;
  readonly paramsString?: string;
  readonly publisher?: string;
  readonly sizeBytes?: number;
}

interface LocalModelsFacadeOptions {
  readonly baseUrl?: string;
  readonly commandRunner?: LmsCommandRunner;
  readonly fetchImplementation?: typeof fetch;
  readonly reporter?: TranslationReporter;
}

interface LmsCliModelRecord {
  readonly architecture?: unknown;
  readonly displayName?: unknown;
  readonly maxContextLength?: unknown;
  readonly modelKey?: unknown;
  readonly paramsString?: unknown;
  readonly publisher?: unknown;
  readonly sizeBytes?: unknown;
  readonly type?: unknown;
}

const resolveBaseUrl = (baseUrl?: string): string =>
  (
    baseUrl ??
    process.env.CODEAI_LMSTUDIO_BASE_URL ??
    DEFAULT_LM_STUDIO_BASE_URL
  )
    .trim()
    .replace(TRAILING_SLASHES_PATTERN, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const resolveLmStudioRecords = (payload: unknown): readonly unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (isRecord(payload) && Array.isArray(payload.models)) {
    return payload.models;
  }
  return [];
};

const parseLmStudioModels = (
  rawJson: string
): readonly LocalModelDescriptor[] => {
  const payload = JSON.parse(rawJson) as unknown;
  const records = resolveLmStudioRecords(payload);
  const models: LocalModelDescriptor[] = [];
  for (const record of records) {
    if (!isRecord(record)) {
      continue;
    }
    const typedRecord = record as LmsCliModelRecord;
    if (typedRecord.type !== "llm") {
      continue;
    }
    const modelKey = asString(typedRecord.modelKey);
    if (!modelKey) {
      continue;
    }
    const displayName = asString(typedRecord.displayName) ?? modelKey;
    models.push({
      architecture: asString(typedRecord.architecture),
      displayName,
      engineId: `${LM_STUDIO_TRANSLATION_ENGINE_PREFIX}${modelKey}`,
      maxContextLength: asNumber(typedRecord.maxContextLength),
      modelKey,
      paramsString: asString(typedRecord.paramsString),
      publisher: asString(typedRecord.publisher),
      sizeBytes: asNumber(typedRecord.sizeBytes),
    });
  }
  return models;
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

const resolveLocalModelLanguages =
  (): readonly LocalizationLanguageCatalogEntry[] =>
    DEFAULT_ENGINE_LANGUAGE_CATALOGS.find(
      (catalog) => catalog.engineId === "google-gtx"
    )?.languages ?? [];

const shouldDisableThinking = (model: LocalModelDescriptor): boolean =>
  QWEN_MODEL_PATTERN.test(model.modelKey) ||
  QWEN_MODEL_PATTERN.test(model.displayName) ||
  QWEN_MODEL_PATTERN.test(model.architecture ?? "");

const resolveTargetLanguageLabel = (targetLanguage: string): string => {
  const normalizedLanguage = targetLanguage.trim();
  const label = TARGET_LANGUAGE_LABELS.get(normalizedLanguage.toLowerCase());
  return label ? `${label} (${normalizedLanguage})` : normalizedLanguage;
};

const buildSystemPrompt = (targetLanguage: string): string =>
  [
    "You are CodeAI Hub's local localization translation engine.",
    `Translate the supplied English text to ${resolveTargetLanguageLabel(targetLanguage)}.`,
    "Return only the translated text, with no explanations.",
    "Never ask the user for text; the text to translate is already supplied between <text> and </text> tags.",
    "Preserve placeholders, ICU tokens, Markdown, code spans, JSON keys, file paths, API routes, CLI commands, URLs, model IDs, provider names, and product names.",
    "If the input is structured with __CODEAI_HUB_LOCALIZATION_ENTRY__ markers, keep every marker exactly unchanged and translate only the text between markers.",
  ].join("\n");

const buildUserPrompt = (
  request: NormalizedTranslationRequest,
  model: LocalModelDescriptor
): string => {
  const prompt = [
    `Translate the exact text inside <text> tags to ${resolveTargetLanguageLabel(request.targetLanguage)}.`,
    "Return only the translated text. Do not include the <text> tags.",
    "<text>",
    request.text,
    "</text>",
  ].join("\n");
  return shouldDisableThinking(model) ? `/no_think\n${prompt}` : prompt;
};

const resolveTranslationRuntimePurpose = (
  request: NormalizedTranslationRequest
): LocalModelRuntimePurpose => {
  if (request.category === "reasoning") {
    return "translation-reasoning";
  }
  if (request.category === "localization_bundle") {
    return "translation-localization";
  }
  return "translation-generic";
};

class LmStudioLocalTranslationEngine implements TranslationEngine {
  readonly id: string;
  private readonly baseUrl: string;
  private readonly commandRunner: LmsCommandRunner;
  private readonly fetchImplementation: typeof fetch;
  private readonly model: LocalModelDescriptor;
  private readonly reporter?: TranslationReporter;
  private readonly runtimeLoadManager: LocalModelsRuntimeLoadManager;

  constructor(options: {
    readonly baseUrl: string;
    readonly commandRunner: LmsCommandRunner;
    readonly fetchImplementation: typeof fetch;
    readonly model: LocalModelDescriptor;
    readonly reporter?: TranslationReporter;
    readonly runtimeLoadManager: LocalModelsRuntimeLoadManager;
  }) {
    this.baseUrl = options.baseUrl;
    this.commandRunner = options.commandRunner;
    this.fetchImplementation = options.fetchImplementation;
    this.id = options.model.engineId;
    this.model = options.model;
    this.reporter = options.reporter;
    this.runtimeLoadManager = options.runtimeLoadManager;
  }

  async translate(
    request: NormalizedTranslationRequest
  ): Promise<TranslationResult> {
    const serverErrorCode = ensureLmStudioServerRunning({
      commandRunner: this.commandRunner,
      reporter: this.reporter,
    });
    if (serverErrorCode) {
      return createFallbackResult(request, this.id, serverErrorCode);
    }

    const apiModelIdentifier = this.ensureModelLoaded(request);
    if (!apiModelIdentifier) {
      return createFallbackResult(
        request,
        this.id,
        "lmstudio_model_load_failed"
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await this.fetchImplementation(
        `${this.baseUrl}/v1/chat/completions`,
        {
          body: JSON.stringify(this.buildPayload(request, apiModelIdentifier)),
          headers: LM_STUDIO_JSON_HEADERS,
          method: "POST",
          signal: controller.signal,
        }
      );
      if (!response.ok) {
        this.reporter?.warn?.("LM Studio translation returned non-OK", {
          engine: this.id,
          modelKey: this.model.modelKey,
          status: response.status,
        });
        return createFallbackResult(request, this.id, "lmstudio_non_ok");
      }
      const translatedText = await readLmStudioCompletionsText(response);
      if (!translatedText) {
        this.reporter?.warn?.("LM Studio translation response was empty", {
          engine: this.id,
          modelKey: this.model.modelKey,
        });
        return createFallbackResult(
          request,
          this.id,
          "lmstudio_empty_response"
        );
      }
      return createTranslatedResult(request, this.id, translatedText);
    } catch (error) {
      this.reporter?.warn?.("LM Studio translation failed", {
        engine: this.id,
        error: error instanceof Error ? error.message : String(error),
        modelKey: this.model.modelKey,
      });
      return createFallbackResult(request, this.id, "lmstudio_request_failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildPayload(
    request: NormalizedTranslationRequest,
    apiModelIdentifier: string
  ): object {
    return {
      max_tokens: DEFAULT_MAX_TOKENS,
      messages: [
        {
          content: buildSystemPrompt(request.targetLanguage),
          role: "system",
        },
        {
          content: buildUserPrompt(request, this.model),
          role: "user",
        },
      ],
      model: apiModelIdentifier,
      stream: true,
      temperature: 0.1,
      top_p: 0.8,
    };
  }

  private ensureModelLoaded(
    request: NormalizedTranslationRequest
  ): string | null {
    try {
      return this.runtimeLoadManager.ensureModelLoaded({
        maxTokens: DEFAULT_MAX_TOKENS,
        model: this.model,
        purpose: resolveTranslationRuntimePurpose(request),
        sourceTextLength: request.text.length,
      });
    } catch (error) {
      this.reporter?.warn?.("LM Studio model load failed", {
        engine: this.id,
        error: error instanceof Error ? error.message : String(error),
        modelKey: this.model.modelKey,
      });
      return null;
    }
  }
}

export class LocalModelsFacade {
  private readonly baseUrl: string;
  private readonly commandRunner: LmsCommandRunner;
  private readonly fetchImplementation: typeof fetch;
  private readonly reporter?: TranslationReporter;
  private readonly runtimeLoadManager: LocalModelsRuntimeLoadManager;

  constructor(options: LocalModelsFacadeOptions = {}) {
    this.baseUrl = resolveBaseUrl(options.baseUrl);
    this.commandRunner =
      options.commandRunner ?? createDefaultLmsCommandRunner();
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.reporter = options.reporter;
    this.runtimeLoadManager = new LocalModelsRuntimeLoadManager({
      commandRunner: this.commandRunner,
    });
  }

  createLocalizationEngineCatalogs(): readonly LocalizationEngineLanguageCatalog[] {
    const engineIds = new Set(
      DEFAULT_ENGINE_LANGUAGE_CATALOGS.map((catalog) => catalog.engineId)
    );
    const catalogs: LocalizationEngineLanguageCatalog[] = [
      ...DEFAULT_ENGINE_LANGUAGE_CATALOGS,
    ];
    const localLanguages = resolveLocalModelLanguages();
    for (const model of this.listModels()) {
      if (engineIds.has(model.engineId)) {
        continue;
      }
      catalogs.push({
        engineId: model.engineId,
        languages: localLanguages,
      });
      engineIds.add(model.engineId);
    }
    return catalogs;
  }

  createTranslationEngines(): readonly TranslationEngine[] {
    return this.listModels().map(
      (model) =>
        new LmStudioLocalTranslationEngine({
          baseUrl: this.baseUrl,
          commandRunner: this.commandRunner,
          fetchImplementation: this.fetchImplementation,
          model,
          reporter: this.reporter,
          runtimeLoadManager: this.runtimeLoadManager,
        })
    );
  }

  listModels(): readonly LocalModelDescriptor[] {
    try {
      const rawJson = this.commandRunner(["ls", "--json"], {
        timeoutMs: DISCOVERY_TIMEOUT_MS,
      });
      return parseLmStudioModels(rawJson);
    } catch (error) {
      this.reporter?.warn?.("LM Studio local model discovery failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}

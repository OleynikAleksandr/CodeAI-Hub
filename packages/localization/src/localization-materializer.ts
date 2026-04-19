import { createHash } from "node:crypto";
import {
  TranslationFacade,
  type TranslationResult,
} from "@codeai-hub/translation";
import { GlossaryBundleLoader } from "./glossary-bundle-loader";
import type {
  ProtectedGlossaryToken,
  ResolvedGlossary,
} from "./glossary-contract";
import { GlossaryMergeService } from "./glossary-merge-service";
import { GlossaryProtector } from "./glossary-protector";
import { LanguageCatalogService } from "./language-catalog-service";
import {
  type LocalizationBundleRecord,
  LocalizationBundleStore,
} from "./localization-bundle-store";
import {
  DEFAULT_LOCALIZATION_ENGINE_ID,
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  type LocalizationCategoryId,
  type LocalizationSourceDictionary,
  type LocalizationTranslationFacadeContract,
} from "./localization-contract";
import { LocalizationMetadataStore } from "./localization-metadata-store";
import type { SourceDictionaryRegistry } from "./source-dictionary-registry";
import {
  buildStructuredBatchText,
  recoverMissingStructuredEntry,
  resolveStructuredBatchTranslations,
  type StructuredBatchEntry,
} from "./structured-batch-entry-recovery";
import { UserGlossaryStore } from "./user-glossary-store";

export interface LocalizationMaterializationRequest {
  readonly category: LocalizationCategoryId;
  readonly engineId?: string;
  readonly force?: boolean;
  readonly sourceLanguage?: string;
  readonly targetLanguage: string;
  readonly workflowTermsPolicy?: "keep_english" | "translate";
}

export interface LocalizationMaterializationResult {
  readonly bundle: LocalizationBundleRecord;
  readonly fallbackTranslationCount: number;
  readonly partialFallbackTranslationCount: number;
  readonly reusedExistingBundle: boolean;
  readonly translatedEntryCount: number;
  readonly uniqueTranslationCount: number;
}

interface LocalizationMaterializerOptions {
  readonly bundleStore?: LocalizationBundleStore;
  readonly defaultEngineId?: string;
  readonly defaultSourceLanguage?: string;
  readonly glossaryBundleLoader?: GlossaryBundleLoader;
  readonly glossaryMergeService?: GlossaryMergeService;
  readonly glossaryProtector?: GlossaryProtector;
  readonly languageCatalogService?: LanguageCatalogService;
  readonly metadataStore?: LocalizationMetadataStore;
  readonly sourceDictionaryRegistry: SourceDictionaryRegistry;
  readonly translationFacade?: LocalizationTranslationFacadeContract;
  readonly userGlossaryStore?: UserGlossaryStore;
}

interface SourceDictionaryTranslationResult {
  readonly bundle: LocalizationBundleRecord;
  readonly fallbackTranslationCount: number;
  readonly partialFallbackTranslationCount: number;
}

const normalizeLanguage = (value: string | undefined, fallback: string) =>
  value?.trim() || fallback;

const LOCALIZATION_TRANSLATION_RETRY_LIMIT = 3;
const LOCALIZATION_TRANSLATION_TIMEOUT_BASE_MS = 6000;
const LOCALIZATION_TRANSLATION_TIMEOUT_MAX_MS = 180_000;
const LOCALIZATION_TRANSLATION_TIMEOUT_PER_CHARACTER_MS = 18;
const LOCALIZATION_BATCH_TRANSLATION_CATEGORY = "localization_bundle";
const resolveLocalizationTranslationTimeoutMs = (text: string): number =>
  Math.min(
    LOCALIZATION_TRANSLATION_TIMEOUT_MAX_MS,
    LOCALIZATION_TRANSLATION_TIMEOUT_BASE_MS +
      text.length * LOCALIZATION_TRANSLATION_TIMEOUT_PER_CHARACTER_MS
  );

const hasUsableLocalizedText = (text: string): boolean =>
  text.trim().length > 0;

const shouldSkipTranslation = (
  sourceLanguage: string,
  targetLanguage: string
): boolean =>
  targetLanguage === "source" ||
  targetLanguage.toLowerCase() === sourceLanguage.toLowerCase();

const resolveEffectiveGlossaryCategory = (
  category: LocalizationCategoryId
): LocalizationCategoryId =>
  category === "ui_interface" ? "workflow_terms" : category;

const createCompositeSourceHash = (
  sourceDictionary: LocalizationSourceDictionary,
  glossary: ResolvedGlossary,
  engineId: string,
  sourceLanguage: string,
  targetLanguage: string,
  workflowTermsPolicy: "keep_english" | "translate"
): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        category: sourceDictionary.category,
        engineId,
        glossary: glossary.rules,
        sourceEntries: sourceDictionary.entries,
        sourceLanguage,
        targetLanguage,
        workflowTermsPolicy,
      })
    )
    .digest("hex");

export class LocalizationMaterializer {
  private readonly bundleStore: LocalizationBundleStore;
  private readonly defaultEngineId: string;
  private readonly defaultSourceLanguage: string;
  private readonly glossaryBundleLoader: GlossaryBundleLoader;
  private readonly glossaryMergeService: GlossaryMergeService;
  private readonly glossaryProtector: GlossaryProtector;
  private readonly languageCatalogService: LanguageCatalogService;
  private readonly metadataStore: LocalizationMetadataStore;
  private readonly sourceDictionaryRegistry: SourceDictionaryRegistry;
  private readonly translationFacade: LocalizationTranslationFacadeContract;
  private readonly userGlossaryStore: UserGlossaryStore;

  constructor(options: LocalizationMaterializerOptions) {
    this.bundleStore = options.bundleStore ?? new LocalizationBundleStore();
    this.defaultEngineId = normalizeLanguage(
      options.defaultEngineId,
      DEFAULT_LOCALIZATION_ENGINE_ID
    );
    this.defaultSourceLanguage = normalizeLanguage(
      options.defaultSourceLanguage,
      DEFAULT_LOCALIZATION_SOURCE_LANGUAGE
    );
    this.glossaryBundleLoader =
      options.glossaryBundleLoader ?? new GlossaryBundleLoader();
    this.glossaryMergeService =
      options.glossaryMergeService ?? new GlossaryMergeService();
    this.glossaryProtector =
      options.glossaryProtector ?? new GlossaryProtector();
    this.languageCatalogService =
      options.languageCatalogService ?? new LanguageCatalogService();
    this.metadataStore =
      options.metadataStore ?? new LocalizationMetadataStore();
    this.sourceDictionaryRegistry = options.sourceDictionaryRegistry;
    this.translationFacade =
      options.translationFacade ??
      new TranslationFacade({
        defaultEngineId: this.defaultEngineId,
      });
    this.userGlossaryStore =
      options.userGlossaryStore ?? new UserGlossaryStore();
  }

  async materialize(
    request: LocalizationMaterializationRequest
  ): Promise<LocalizationMaterializationResult | null> {
    const sourceLanguage = normalizeLanguage(
      request.sourceLanguage,
      this.defaultSourceLanguage
    );
    const targetLanguage = normalizeLanguage(
      request.targetLanguage,
      this.defaultSourceLanguage
    );
    const sourceDictionary = this.sourceDictionaryRegistry.resolve(
      request.category,
      sourceLanguage
    );
    if (!sourceDictionary) {
      return null;
    }

    const effectiveGlossaryCategory = resolveEffectiveGlossaryCategory(
      request.category
    );
    const workflowTermsPolicy = request.workflowTermsPolicy ?? "keep_english";
    const engineId = request.engineId ?? this.defaultEngineId;
    const glossary = await this.resolveGlossary(
      effectiveGlossaryCategory,
      targetLanguage,
      workflowTermsPolicy
    );
    const compositeSourceHash = createCompositeSourceHash(
      sourceDictionary,
      glossary,
      engineId,
      sourceLanguage,
      targetLanguage,
      workflowTermsPolicy
    );
    const skipTranslation = shouldSkipTranslation(
      sourceLanguage,
      targetLanguage
    );
    if (!(request.force || skipTranslation)) {
      const [existingBundle, existingMetadata] = await Promise.all([
        this.bundleStore.load(request.category, targetLanguage),
        this.metadataStore.getBundle(request.category, targetLanguage),
      ]);
      if (
        existingBundle &&
        existingMetadata?.sourceHash === compositeSourceHash
      ) {
        return {
          bundle: existingBundle,
          fallbackTranslationCount: 0,
          partialFallbackTranslationCount: 0,
          reusedExistingBundle: true,
          translatedEntryCount: Object.keys(existingBundle.entries).length,
          uniqueTranslationCount: 0,
        };
      }
    }

    const translationResult: SourceDictionaryTranslationResult = skipTranslation
      ? {
          bundle: this.createSourceBundle(sourceDictionary, targetLanguage),
          fallbackTranslationCount: 0,
          partialFallbackTranslationCount: 0,
        }
      : await this.translateSourceDictionary(
          effectiveGlossaryCategory,
          glossary,
          sourceDictionary,
          sourceLanguage,
          targetLanguage,
          engineId
        );
    const bundle = translationResult.bundle;

    if (!skipTranslation) {
      await Promise.all([
        this.bundleStore.save(bundle),
        this.metadataStore.upsertBundle({
          category: bundle.category,
          engineId,
          generatedAt: new Date().toISOString(),
          language: bundle.language,
          sourceHash: compositeSourceHash,
        }),
      ]);
    }

    return {
      bundle,
      fallbackTranslationCount: translationResult.fallbackTranslationCount,
      partialFallbackTranslationCount:
        translationResult.partialFallbackTranslationCount,
      reusedExistingBundle: false,
      translatedEntryCount: Object.keys(bundle.entries).length,
      uniqueTranslationCount: skipTranslation
        ? 0
        : new Set(Object.values(sourceDictionary.entries)).size,
    };
  }

  private async resolveGlossary(
    category: LocalizationCategoryId,
    targetLanguage: string,
    workflowTermsPolicy: "keep_english" | "translate"
  ): Promise<ResolvedGlossary> {
    const [baseBundle, languageBundle, userOverrides] = await Promise.all([
      this.glossaryBundleLoader.loadBaseBundle(),
      this.glossaryBundleLoader.loadLanguageBundle(targetLanguage),
      this.userGlossaryStore.load(),
    ]);

    const mergedGlossary = this.glossaryMergeService.mergeBundles([
      baseBundle,
      languageBundle,
      this.glossaryMergeService.createUserOverrideBundle(userOverrides),
    ]);

    if (
      !(category === "workflow_terms" && workflowTermsPolicy === "translate")
    ) {
      return mergedGlossary;
    }

    return {
      rules: mergedGlossary.rules.filter(
        (rule) =>
          !(
            rule.kind === "preserve" &&
            rule.categories?.includes("workflow_terms")
          )
      ),
    };
  }

  private createSourceBundle(
    sourceDictionary: LocalizationSourceDictionary,
    targetLanguage: string
  ): LocalizationBundleRecord {
    return {
      category: sourceDictionary.category,
      language: targetLanguage,
      entries: { ...sourceDictionary.entries },
    };
  }

  private async translateSourceDictionary(
    category: LocalizationCategoryId,
    glossary: ResolvedGlossary,
    sourceDictionary: LocalizationSourceDictionary,
    sourceLanguage: string,
    targetLanguage: string,
    engineId: string
  ): Promise<SourceDictionaryTranslationResult> {
    if (
      !this.languageCatalogService.supportsLanguage(targetLanguage, engineId)
    ) {
      throw new Error(
        `Localization engine '${engineId}' does not support language '${targetLanguage}'.`
      );
    }

    const structuredBatchEntries: StructuredBatchEntry[] = [];
    const structuredEntryBySource = new Map<string, StructuredBatchEntry>();
    for (const [messageId, sourceText] of Object.entries(
      sourceDictionary.entries
    )) {
      let structuredEntry = structuredEntryBySource.get(sourceText);
      if (!structuredEntry) {
        const protectedText = this.glossaryProtector.hasApplicableRules(
          category,
          targetLanguage,
          glossary
        )
          ? this.glossaryProtector.protect(
              sourceText,
              category,
              targetLanguage,
              glossary
            )
          : { protectedText: sourceText, tokens: [] };
        structuredEntry = {
          entryId: structuredBatchEntries.length,
          messageIds: [messageId],
          protectedText: protectedText.protectedText,
          sourceText,
          tokens: protectedText.tokens,
        };
        structuredEntryBySource.set(sourceText, structuredEntry);
        structuredBatchEntries.push(structuredEntry);
        continue;
      }
      structuredEntry.messageIds.push(messageId);
    }
    if (structuredBatchEntries.length === 0) {
      return {
        bundle: this.createSourceBundle(sourceDictionary, targetLanguage),
        fallbackTranslationCount: 0,
        partialFallbackTranslationCount: 0,
      };
    }

    const batchText = buildStructuredBatchText(structuredBatchEntries);
    const translationResult = await this.translateProtectedTextWithRetry({
      category: LOCALIZATION_BATCH_TRANSLATION_CATEGORY,
      engineId,
      protectedText: { protectedText: batchText, tokens: [] },
      sourceLanguage,
      targetLanguage,
    });
    if (translationResult.status !== "translated") {
      return {
        bundle: this.createSourceBundle(sourceDictionary, targetLanguage),
        fallbackTranslationCount: structuredBatchEntries.length,
        partialFallbackTranslationCount: 0,
      };
    }

    const fallbackTranslationCount = 0;
    const { partialFallbackTranslationCount, translatedEntries } =
      await resolveStructuredBatchTranslations({
        batchReportedPartialFallback:
          translationResult.errorCode === "partial_fallback",
        entries: structuredBatchEntries,
        finalText: translationResult.finalText,
        glossaryProtector: this.glossaryProtector,
        retryMissingEntry: (entry) =>
          recoverMissingStructuredEntry({
            entry,
            glossaryProtector: this.glossaryProtector,
            targetLanguage,
            translateEntry: () =>
              this.translateProtectedTextWithRetry({
                category: LOCALIZATION_BATCH_TRANSLATION_CATEGORY,
                engineId,
                protectedText: {
                  protectedText: entry.protectedText,
                  tokens: entry.tokens,
                },
                sourceLanguage,
                targetLanguage,
              }),
          }),
        targetLanguage,
      });

    return {
      bundle: {
        category: sourceDictionary.category,
        entries: translatedEntries,
        language: targetLanguage,
      },
      fallbackTranslationCount,
      partialFallbackTranslationCount,
    };
  }

  private async translateProtectedTextWithRetry(options: {
    readonly category: string;
    readonly engineId: string;
    readonly protectedText: {
      readonly protectedText: string;
      readonly tokens: readonly ProtectedGlossaryToken[];
    };
    readonly sourceLanguage: string;
    readonly targetLanguage: string;
  }): Promise<TranslationResult> {
    const timeoutMs = resolveLocalizationTranslationTimeoutMs(
      options.protectedText.protectedText
    );
    let lastAttempt: TranslationResult | null = null;

    for (
      let attemptIndex = 0;
      attemptIndex < LOCALIZATION_TRANSLATION_RETRY_LIMIT;
      attemptIndex += 1
    ) {
      const translationResult = await this.translationFacade.translate({
        category: options.category,
        chunkingMode: "disabled",
        engineId: options.engineId,
        sourceLanguage: options.sourceLanguage,
        targetLanguage: options.targetLanguage,
        text: options.protectedText.protectedText,
        timeoutMs,
      });
      const restoredText = this.glossaryProtector.restore(
        translationResult.finalText,
        options.targetLanguage,
        options.protectedText.tokens
      );

      lastAttempt = translationResult;

      const completedWithoutFallback =
        translationResult.status === "translated" &&
        translationResult.errorCode !== "partial_fallback" &&
        hasUsableLocalizedText(restoredText);
      if (completedWithoutFallback) {
        return translationResult;
      }
    }

    return (
      lastAttempt ?? {
        engine: options.engineId,
        errorCode: "localization_retry_exhausted",
        finalText: options.protectedText.protectedText,
        originalText: options.protectedText.protectedText,
        sourceLanguage: options.sourceLanguage,
        status: "fallback",
        targetLanguage: options.targetLanguage,
        translatedText: null,
      }
    );
  }
}

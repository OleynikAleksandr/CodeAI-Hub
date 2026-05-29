import assert from "node:assert/strict";
import test from "node:test";
import type {
  TranslationRequest,
  TranslationResult,
} from "@codeai-hub/translation";
import { GlossaryMergeService } from "./glossary-merge-service";
import { GlossaryProtector } from "./glossary-protector";
import { LocalizationMaterializer } from "./localization-materializer";
import { resolveLikelyUntranslatedEntryCount } from "./localization-translation-quality";
import { SourceDictionaryRegistry } from "./source-dictionary-registry";

test("resolveLikelyUntranslatedEntryCount flags mostly unchanged English translations", () => {
  assert.equal(
    resolveLikelyUntranslatedEntryCount({
      sourceEntries: {
        first: "Open settings",
        second: "Save changes",
        third: "Close dialog",
        fourth: "API",
      },
      translatedEntries: {
        first: "Open settings",
        second: "Save changes",
        third: "Close dialog",
        fourth: "API",
      },
    }),
    4
  );
  assert.equal(
    resolveLikelyUntranslatedEntryCount({
      sourceEntries: { first: "API", second: "JSON" },
      translatedEntries: { first: "API", second: "JSON" },
    }),
    0
  );
});

test("LocalizationMaterializer treats mostly unchanged local model output as partial fallback", async () => {
  let savedBundleCount = 0;
  let savedMetadataCount = 0;
  const sourceDictionaryRegistry = new SourceDictionaryRegistry([
    {
      category: "system_feedback",
      entries: {
        first: "Open settings",
        second: "Save changes",
        third: "Close dialog",
        fourth: "Restart Core",
      },
      language: "en",
    },
  ]);
  const materializer = new LocalizationMaterializer({
    bundleStore: {
      load: async () => null,
      save: () => {
        savedBundleCount += 1;
        return Promise.resolve();
      },
    } as never,
    glossaryBundleLoader: {
      loadBaseBundle: async () => ({ rules: [] }),
      loadLanguageBundle: async () => ({ rules: [] }),
    } as never,
    glossaryMergeService: new GlossaryMergeService(),
    glossaryProtector: new GlossaryProtector(),
    languageCatalogService: {
      supportsLanguage: () => true,
    } as never,
    metadataStore: {
      getBundle: async () => null,
      upsertBundle: () => {
        savedMetadataCount += 1;
        return Promise.resolve();
      },
    } as never,
    sourceDictionaryRegistry,
    translationFacade: {
      translate: (request: TranslationRequest): Promise<TranslationResult> =>
        Promise.resolve({
          engine: request.engineId ?? "lmstudio:test",
          finalText: request.text,
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          status: "translated",
          targetLanguage: request.targetLanguage,
          translatedText: request.text,
        }),
    } as never,
    userGlossaryStore: {
      load: async () => ({ preserve: [] }),
    } as never,
  });

  const result = await materializer.materialize({
    category: "system_feedback",
    engineId: "lmstudio:test",
    targetLanguage: "ru",
  });

  assert.ok(result);
  assert.equal(result.partialFallbackTranslationCount, 4);
  assert.equal(savedBundleCount, 0);
  assert.equal(savedMetadataCount, 0);
});

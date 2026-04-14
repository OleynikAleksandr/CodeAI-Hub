import assert from "node:assert/strict";
import test from "node:test";
import type {
  TranslationRequest,
  TranslationResult,
} from "@codeai-hub/translation";
import { GlossaryMergeService } from "./glossary-merge-service";
import { GlossaryProtector } from "./glossary-protector";
import { LocalizationMaterializer } from "./localization-materializer";
import { SourceDictionaryRegistry } from "./source-dictionary-registry";

test("LocalizationMaterializer disables chunking for interface localization requests", async () => {
  const translationRequests: TranslationRequest[] = [];
  const sourceDictionaryRegistry = new SourceDictionaryRegistry([
    {
      category: "user_guidance",
      entries: {
        "help.blocking_sync":
          "This user-facing helper text must stay in one translation request.",
      },
      language: "en",
    },
  ]);

  const materializer = new LocalizationMaterializer({
    bundleStore: {
      load: async () => null,
      save: async () => undefined,
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
      upsertBundle: async () => undefined,
    } as never,
    sourceDictionaryRegistry,
    translationFacade: {
      translate: (request: TranslationRequest): Promise<TranslationResult> => {
        translationRequests.push(request);
        return Promise.resolve({
          engine: request.engineId ?? "fake-engine",
          finalText: `[ru] ${request.text}`,
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          status: "translated",
          targetLanguage: request.targetLanguage,
          translatedText: `[ru] ${request.text}`,
        });
      },
    } as never,
    userGlossaryStore: {
      load: async () => ({ preserve: [] }),
    } as never,
  });

  const result = await materializer.materialize({
    category: "user_guidance",
    engineId: "codex-gpt-5.3-codex-spark",
    targetLanguage: "ru",
  });

  assert.ok(result);
  assert.equal(translationRequests.length, 1);
  assert.equal(translationRequests[0]?.chunkingMode, "disabled");
});

test("LocalizationMaterializer retries interface localization with dynamic timeout", async () => {
  const translationRequests: TranslationRequest[] = [];
  let attempt = 0;
  const sourceText =
    "This interface helper is long enough to require a timeout above the legacy three-second default.";
  const sourceDictionaryRegistry = new SourceDictionaryRegistry([
    {
      category: "user_guidance",
      entries: {
        "help.retry_timeout": sourceText,
      },
      language: "en",
    },
  ]);

  const materializer = new LocalizationMaterializer({
    bundleStore: {
      load: async () => null,
      save: async () => undefined,
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
      upsertBundle: async () => undefined,
    } as never,
    sourceDictionaryRegistry,
    translationFacade: {
      translate: (request: TranslationRequest): Promise<TranslationResult> => {
        translationRequests.push(request);
        attempt += 1;
        if (attempt === 1) {
          return Promise.resolve({
            engine: request.engineId ?? "fake-engine",
            errorCode: "request_failed",
            finalText: request.text,
            originalText: request.text,
            sourceLanguage: request.sourceLanguage,
            status: "fallback",
            targetLanguage: request.targetLanguage,
            translatedText: null,
          });
        }

        return Promise.resolve({
          engine: request.engineId ?? "fake-engine",
          finalText: `[ru] ${request.text}`,
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          status: "translated",
          targetLanguage: request.targetLanguage,
          translatedText: `[ru] ${request.text}`,
        });
      },
    } as never,
    userGlossaryStore: {
      load: async () => ({ preserve: [] }),
    } as never,
  });

  const result = await materializer.materialize({
    category: "user_guidance",
    engineId: "codex-gpt-5.3-codex-spark",
    targetLanguage: "ru",
  });

  assert.ok(result);
  assert.equal(translationRequests.length, 2);
  assert.equal((translationRequests[0]?.timeoutMs ?? 0) > 3000, true);
  assert.equal(result.fallbackTranslationCount, 0);
  assert.equal(
    result.bundle.entries["help.retry_timeout"],
    `[ru] ${sourceText}`
  );
});

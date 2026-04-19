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

const STRUCTURED_ENTRY_PATTERN =
  /(__CODEAI_HUB_LOCALIZATION_ENTRY__\d+__START__)\n([\s\S]*?)\n(__CODEAI_HUB_LOCALIZATION_ENTRY__\d+__END__)/g;

const translateStructuredBatch = (text: string): string =>
  text.replace(
    STRUCTURED_ENTRY_PATTERN,
    (_match, startMarker: string, body: string, endMarker: string) =>
      `${startMarker}\n[ru] ${body.trim()}\n${endMarker}`
  );

test("LocalizationMaterializer disables chunking for interface localization requests", async () => {
  const translationRequests: TranslationRequest[] = [];
  const sourceDictionaryRegistry = new SourceDictionaryRegistry([
    {
      category: "user_guidance",
      entries: {
        "help.blocking_sync":
          "This user-facing helper text must stay in one translation request.",
        "help.blocking_sync_duplicate":
          "This user-facing helper text must stay in one translation request.",
        "help.bundle_batch":
          "This second helper entry must travel inside the same batch.",
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
        const translatedBatch = translateStructuredBatch(request.text);
        return Promise.resolve({
          engine: request.engineId ?? "fake-engine",
          finalText: translatedBatch,
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          status: "translated",
          targetLanguage: request.targetLanguage,
          translatedText: translatedBatch,
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
  assert.equal(translationRequests[0]?.category, "localization_bundle");
  assert.equal(translationRequests[0]?.chunkingMode, "disabled");
  assert.equal(result.uniqueTranslationCount, 2);
  assert.equal(
    result.bundle.entries["help.blocking_sync_duplicate"],
    "[ru] This user-facing helper text must stay in one translation request."
  );
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

        const translatedBatch = translateStructuredBatch(request.text);
        return Promise.resolve({
          engine: request.engineId ?? "fake-engine",
          finalText: translatedBatch,
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          status: "translated",
          targetLanguage: request.targetLanguage,
          translatedText: translatedBatch,
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
  assert.equal(translationRequests[0]?.category, "localization_bundle");
  assert.equal((translationRequests[0]?.timeoutMs ?? 0) > 3000, true);
  assert.equal(result.fallbackTranslationCount, 0);
  assert.equal(
    result.bundle.entries["help.retry_timeout"],
    `[ru] ${sourceText}`
  );
});

test("LocalizationMaterializer tracks partial fallback when a batch entry is missing", async () => {
  const sourceDictionaryRegistry = new SourceDictionaryRegistry([
    {
      category: "user_guidance",
      entries: {
        "help.present": "This helper survives parsing.",
        "help.missing": "This helper falls back to source.",
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
      translate: (request: TranslationRequest): Promise<TranslationResult> =>
        Promise.resolve({
          engine: request.engineId ?? "fake-engine",
          errorCode: "partial_fallback",
          finalText: [
            "__CODEAI_HUB_LOCALIZATION_ENTRY__0__START__",
            "[ru] This helper survives parsing.",
            "__CODEAI_HUB_LOCALIZATION_ENTRY__0__END__",
          ].join("\n"),
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          status: "translated",
          targetLanguage: request.targetLanguage,
          translatedText: [
            "__CODEAI_HUB_LOCALIZATION_ENTRY__0__START__",
            "[ru] This helper survives parsing.",
            "__CODEAI_HUB_LOCALIZATION_ENTRY__0__END__",
          ].join("\n"),
        }),
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
  assert.equal(result.fallbackTranslationCount, 0);
  assert.equal(result.partialFallbackTranslationCount, 2);
  assert.equal(
    result.bundle.entries["help.present"],
    "[ru] This helper survives parsing."
  );
  assert.equal(
    result.bundle.entries["help.missing"],
    "This helper falls back to source."
  );
});

test("LocalizationMaterializer retries a missing batch entry individually before failing strict readiness", async () => {
  const translationRequests: TranslationRequest[] = [];
  const sourceDictionaryRegistry = new SourceDictionaryRegistry([
    {
      category: "user_guidance",
      entries: {
        "help.present": "This helper survives parsing.",
        "help.recovered": "This helper recovers on retry.",
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
        if (
          request.text.includes("__CODEAI_HUB_LOCALIZATION_ENTRY__0__START__")
        ) {
          return Promise.resolve({
            engine: request.engineId ?? "fake-engine",
            errorCode: "partial_fallback",
            finalText: [
              "__CODEAI_HUB_LOCALIZATION_ENTRY__0__START__",
              "[ru] This helper survives parsing.",
              "__CODEAI_HUB_LOCALIZATION_ENTRY__0__END__",
            ].join("\n"),
            originalText: request.text,
            sourceLanguage: request.sourceLanguage,
            status: "translated",
            targetLanguage: request.targetLanguage,
            translatedText: [
              "__CODEAI_HUB_LOCALIZATION_ENTRY__0__START__",
              "[ru] This helper survives parsing.",
              "__CODEAI_HUB_LOCALIZATION_ENTRY__0__END__",
            ].join("\n"),
          });
        }

        return Promise.resolve({
          engine: request.engineId ?? "fake-engine",
          finalText: "[ru] This helper recovers on retry.",
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          status: "translated",
          targetLanguage: request.targetLanguage,
          translatedText: "[ru] This helper recovers on retry.",
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
  assert.equal(translationRequests.length, 4);
  assert.equal(
    translationRequests.at(-1)?.text,
    "This helper recovers on retry."
  );
  assert.equal(result.fallbackTranslationCount, 0);
  assert.equal(result.partialFallbackTranslationCount, 0);
  assert.equal(
    result.bundle.entries["help.present"],
    "[ru] This helper survives parsing."
  );
  assert.equal(
    result.bundle.entries["help.recovered"],
    "[ru] This helper recovers on retry."
  );
});

test("LocalizationMaterializer routes bundle materialization through anthropic-claude-haiku-4-5", async () => {
  const translationRequests: TranslationRequest[] = [];
  const sourceDictionaryRegistry = new SourceDictionaryRegistry([
    {
      category: "user_guidance",
      entries: {
        "help.haiku.entry": "Entry dispatched to Claude Haiku engine",
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
        const translatedBatch = translateStructuredBatch(request.text);
        return Promise.resolve({
          engine: request.engineId ?? "anthropic-claude-haiku-4-5",
          finalText: translatedBatch,
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          status: "translated",
          targetLanguage: request.targetLanguage,
          translatedText: translatedBatch,
        });
      },
    } as never,
    userGlossaryStore: {
      load: async () => ({ preserve: [] }),
    } as never,
  });

  const result = await materializer.materialize({
    category: "user_guidance",
    engineId: "anthropic-claude-haiku-4-5",
    targetLanguage: "ru",
  });

  assert.ok(result);
  assert.equal(translationRequests.length, 1);
  assert.equal(translationRequests[0]?.engineId, "anthropic-claude-haiku-4-5");
  assert.equal(
    result.bundle.entries["help.haiku.entry"],
    "[ru] Entry dispatched to Claude Haiku engine"
  );
});

test("LocalizationMaterializer routes system feedback helper bundles through anthropic-claude-haiku-4-5", async () => {
  const translationRequests: TranslationRequest[] = [];
  const sourceDictionaryRegistry = new SourceDictionaryRegistry([
    {
      category: "system_feedback",
      entries: {
        "pm.description.help.title": "Description Help",
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
        const translatedBatch = translateStructuredBatch(request.text);
        return Promise.resolve({
          engine: request.engineId ?? "anthropic-claude-haiku-4-5",
          finalText: translatedBatch,
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          status: "translated",
          targetLanguage: request.targetLanguage,
          translatedText: translatedBatch,
        });
      },
    } as never,
    userGlossaryStore: {
      load: async () => ({ preserve: [] }),
    } as never,
  });

  const result = await materializer.materialize({
    category: "system_feedback",
    engineId: "anthropic-claude-haiku-4-5",
    targetLanguage: "ru",
  });

  assert.ok(result);
  assert.equal(translationRequests.length, 1);
  assert.equal(translationRequests[0]?.targetLanguage, "ru");
  assert.equal(
    result.bundle.entries["pm.description.help.title"],
    "[ru] Description Help"
  );
});

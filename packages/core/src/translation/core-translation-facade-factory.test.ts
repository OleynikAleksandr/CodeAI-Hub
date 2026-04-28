import assert from "node:assert/strict";
import test from "node:test";
import type {
  ClaudeHaikuTranslationService,
  ClaudeHaikuTranslationServiceResult,
} from "@codeai-hub/claude-module";
import { CLAUDE_HAIKU_TRANSLATION_ENGINE_ID } from "@codeai-hub/claude-module";
import type { CodexAppServerTranslationServiceResult } from "@codeai-hub/codex-app-server-module";
import type {
  NormalizedTranslationRequest,
  TranslationEngine,
  TranslationRequest,
  TranslationResult,
} from "@codeai-hub/translation";
import { TranslationFacade } from "@codeai-hub/translation";
import { ClaudeHaikuTranslationEngine } from "./claude-haiku-translation-engine";
import {
  CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID,
  CODEX_GPT_5_4_MINI_TRANSLATION_MODEL_ID,
  CODEX_SPARK_TRANSLATION_ENGINE_ID,
  CodexAppServerTranslationEngine,
} from "./codex-app-server-translation-engine";
import {
  buildCoreTranslationEngines,
  createCoreTranslationFacade,
} from "./core-translation-facade-factory";

const createNormalizedRequest = (): NormalizedTranslationRequest => ({
  category: "generic",
  engineId: CLAUDE_HAIKU_TRANSLATION_ENGINE_ID,
  providerId: "claude",
  sourceLanguage: "en",
  targetLanguage: "ru",
  text: "Hello",
  timeoutMs: 5000,
});

const createFakeService = (
  result: ClaudeHaikuTranslationServiceResult
): ClaudeHaikuTranslationService =>
  ({
    translate: (
      _request: TranslationRequest,
      _options?: { readonly timeoutMs?: number }
    ) => Promise.resolve(result),
  }) as unknown as ClaudeHaikuTranslationService;

const createCodexRequest = (): NormalizedTranslationRequest => ({
  category: "reasoning",
  engineId: CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID,
  sourceLanguage: "en",
  targetLanguage: "es",
  text: "Settings",
  timeoutMs: 5000,
});

class RecordingFallbackEngine implements TranslationEngine {
  readonly calls: NormalizedTranslationRequest[] = [];
  readonly id: string;
  private readonly result: TranslationResult;

  constructor(id: string, result: TranslationResult) {
    this.id = id;
    this.result = result;
  }

  translate(request: NormalizedTranslationRequest): Promise<TranslationResult> {
    this.calls.push(request);
    return Promise.resolve(this.result);
  }
}

test("ClaudeHaikuTranslationEngine maps service text into TranslationResult", async () => {
  const engine = new ClaudeHaikuTranslationEngine({
    service: createFakeService({ text: "Привет" }),
  });

  const result = await engine.translate(createNormalizedRequest());

  assert.equal(result.engine, CLAUDE_HAIKU_TRANSLATION_ENGINE_ID);
  assert.equal(result.status, "translated");
  assert.equal(result.translatedText, "Привет");
  assert.equal(result.finalText, "Привет");
  assert.equal(result.errorCode, undefined);
});

test("ClaudeHaikuTranslationEngine falls back when service returns null", async () => {
  const engine = new ClaudeHaikuTranslationEngine({
    service: createFakeService({
      errorCode: "request_failed",
      text: null,
    }),
  });

  const result = await engine.translate(createNormalizedRequest());

  assert.equal(result.status, "fallback");
  assert.equal(result.engine, CLAUDE_HAIKU_TRANSLATION_ENGINE_ID);
  assert.equal(result.errorCode, "request_failed");
  assert.equal(result.translatedText, null);
  assert.equal(result.finalText, "Hello");
});

test("CodexAppServerTranslationEngine maps provider-owned service text into TranslationResult", async () => {
  const calls: NormalizedTranslationRequest[] = [];
  const engine = new CodexAppServerTranslationEngine({
    engineId: CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID,
    modelId: CODEX_GPT_5_4_MINI_TRANSLATION_MODEL_ID,
    service: {
      translate: (request) => {
        calls.push(request);
        return Promise.resolve({
          finalText: "Configuracion",
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          status: "translated",
          targetLanguage: request.targetLanguage,
          translatedText: "Configuracion",
        } satisfies CodexAppServerTranslationServiceResult);
      },
    },
  });

  const result = await engine.translate(createCodexRequest());

  assert.equal(calls.length, 1);
  assert.equal(result.engine, CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID);
  assert.equal(result.status, "translated");
  assert.equal(result.finalText, "Configuracion");
});

test("CodexAppServerTranslationEngine falls back to shared codex exec engine when app-server returns fallback", async () => {
  const warnings: string[] = [];
  const fallbackEngine = new RecordingFallbackEngine(
    CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID,
    {
      engine: CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID,
      finalText: "[exec] Settings",
      originalText: "Settings",
      sourceLanguage: "en",
      status: "translated",
      targetLanguage: "es",
      translatedText: "[exec] Settings",
    }
  );
  const engine = new CodexAppServerTranslationEngine({
    engineId: CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID,
    fallbackEngine,
    modelId: CODEX_GPT_5_4_MINI_TRANSLATION_MODEL_ID,
    reporter: {
      warn: (message) => {
        warnings.push(message);
      },
    },
    service: {
      translate: (request) =>
        Promise.resolve({
          errorCode: "request_failed",
          finalText: request.text,
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          status: "fallback",
          targetLanguage: request.targetLanguage,
          translatedText: null,
        }),
    },
  });

  const result = await engine.translate(createCodexRequest());

  assert.equal(fallbackEngine.calls.length, 1);
  assert.equal(result.status, "translated");
  assert.equal(result.finalText, "[exec] Settings");
  assert.equal(
    warnings.includes("Codex app-server translation fell back to codex exec"),
    true
  );
});

test("buildCoreTranslationEngines registers built-in engines without Haiku when service is absent", () => {
  const engines = buildCoreTranslationEngines({});
  const ids = engines.map((engine) => engine.id);

  assert.equal(ids.includes("google-gtx"), true);
  assert.equal(ids.includes("codex-gpt-5.4-mini"), true);
  assert.equal(ids.includes("codex-gpt-5.3-codex-spark"), true);
  assert.equal(ids.includes(CLAUDE_HAIKU_TRANSLATION_ENGINE_ID), false);
});

test("buildCoreTranslationEngines registers provider-owned Codex app-server engines over shared fallbacks", () => {
  const engines = buildCoreTranslationEngines({});
  const codexMiniEngines = engines.filter(
    (engine) => engine.id === CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID
  );
  const codexSparkEngines = engines.filter(
    (engine) => engine.id === CODEX_SPARK_TRANSLATION_ENGINE_ID
  );

  assert.equal(codexMiniEngines.length, 1);
  assert.equal(codexSparkEngines.length, 1);
  assert.equal(
    codexMiniEngines[0] instanceof CodexAppServerTranslationEngine,
    true
  );
  assert.equal(
    codexSparkEngines[0] instanceof CodexAppServerTranslationEngine,
    true
  );
});

test("buildCoreTranslationEngines appends Claude Haiku engine when service is provided", () => {
  const engines = buildCoreTranslationEngines({
    claudeHaikuTranslationService: createFakeService({ text: "ok" }),
  });
  const ids = engines.map((engine) => engine.id);

  assert.equal(ids.includes(CLAUDE_HAIKU_TRANSLATION_ENGINE_ID), true);
  assert.equal(
    ids.indexOf("google-gtx") < ids.indexOf(CLAUDE_HAIKU_TRANSLATION_ENGINE_ID),
    true
  );
});

test("createCoreTranslationFacade returns a TranslationFacade instance", () => {
  const facade = createCoreTranslationFacade({});
  assert.equal(facade instanceof TranslationFacade, true);
});

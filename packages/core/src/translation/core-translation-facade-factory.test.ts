import assert from "node:assert/strict";
import test from "node:test";
import type {
  ClaudeHaikuTranslationService,
  ClaudeHaikuTranslationServiceResult,
} from "@codeai-hub/claude-module";
import { CLAUDE_HAIKU_TRANSLATION_ENGINE_ID } from "@codeai-hub/claude-module";
import type {
  NormalizedTranslationRequest,
  TranslationRequest,
} from "@codeai-hub/translation";
import { TranslationFacade } from "@codeai-hub/translation";
import { ClaudeHaikuTranslationEngine } from "./claude-haiku-translation-engine";
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

test("buildCoreTranslationEngines registers built-in engines without Haiku when service is absent", () => {
  const engines = buildCoreTranslationEngines({});
  const ids = engines.map((engine) => engine.id);

  assert.equal(ids.includes("google-gtx"), true);
  assert.equal(ids.includes("codex-gpt-5.4-mini"), true);
  assert.equal(ids.includes("codex-gpt-5.3-codex-spark"), true);
  assert.equal(ids.includes(CLAUDE_HAIKU_TRANSLATION_ENGINE_ID), false);
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

import assert from "node:assert/strict";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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
  buildOpenRouterTranslationPrompt,
  createCoreTranslationFacade,
  GeminiFlashLiteOpenRouterTranslationEngine,
} from "./core-translation-facade-factory";
import type { ProtectedOpenRouterTranslationText } from "./open-router-translation-glossary-protection";

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

const createGeminiRequest = (): NormalizedTranslationRequest => ({
  category: "reasoning",
  engineId: "google/gemini-2.5-flash-lite",
  sourceLanguage: "en",
  targetLanguage: "ru",
  text: "Use shell in Project Manager.",
  timeoutMs: 5000,
});

const withFakeLmStudioCli = async (
  runTest: () => Promise<void> | void
): Promise<void> => {
  const binDirectory = await mkdtemp(path.join(tmpdir(), "codeai-lms-bin-"));
  const lmsPath = path.join(binDirectory, "lms");
  const originalPath = process.env.PATH;
  await writeFile(
    lmsPath,
    [
      "#!/bin/sh",
      'if [ "$1" = "ls" ] && [ "$2" = "--json" ]; then',
      'printf \'%s\\n\' \'[{"type":"llm","modelKey":"mlx-community/factory-test","displayName":"Factory Test","architecture":"gemma"}]\'',
      "exit 0",
      "fi",
      "exit 0",
      "",
    ].join("\n"),
    "utf8"
  );
  await chmod(lmsPath, 0o755);
  process.env.PATH = `${binDirectory}:${originalPath ?? ""}`;
  try {
    await runTest();
  } finally {
    process.env.PATH = originalPath;
  }
};

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

test("buildOpenRouterTranslationPrompt treats glossary terms as non-exhaustive", () => {
  const prompt = buildOpenRouterTranslationPrompt(createGeminiRequest(), {
    protectedTerms: ["shell"],
    restore: (translatedText) => translatedText,
    text: "Use [[CAIHUB_TERM_0]] in Project Manager.",
  });

  assert.equal(prompt.includes("non-exhaustive"), true);
  assert.equal(prompt.includes("not the complete set"), true);
  assert.equal(prompt.includes("translate normal prose naturally"), true);
  assert.equal(prompt.includes("[[CAIHUB_TERM_N]] glossary markers"), true);
  assert.equal(prompt.includes("- shell"), true);
  assert.equal(
    prompt.includes("Use [[CAIHUB_TERM_0]] in Project Manager."),
    true
  );
  assert.equal(prompt.includes('"Final_Description.md"'), true);
  assert.equal(prompt.includes('"create_initial_draft"'), true);
  assert.equal(prompt.includes('"finder-widget-shell"'), true);
  assert.equal(prompt.includes('"workflow" may be translated'), true);
  assert.equal(
    prompt.includes(
      '"runtime", "boundary", "product part", and "input" may be translated'
    ),
    true
  );
});

test("GeminiFlashLiteOpenRouterTranslationEngine restores protected glossary markers", async () => {
  const originalFetch = globalThis.fetch;
  const originalOpenRouterApiKey = process.env.OPENROUTER_API_KEY;
  const prompts: string[] = [];
  const protectedText: ProtectedOpenRouterTranslationText = {
    protectedTerms: ["shell"],
    restore: (translatedText) =>
      translatedText.replace("[[CAIHUB_TERM_0]]", "shell"),
    text: "Use [[CAIHUB_TERM_0]] in Project Manager.",
  };
  globalThis.fetch = ((_input, init) => {
    const body = JSON.parse(String(init?.body)) as {
      readonly messages?: readonly { readonly content?: string }[];
      readonly model?: string;
    };
    assert.equal(body.model, "google/gemini-2.5-flash-lite");
    prompts.push(body.messages?.[1]?.content ?? "");
    return Promise.resolve(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "Используйте [[CAIHUB_TERM_0]] в Project Manager.",
              },
            },
          ],
        }),
        { status: 200 }
      )
    );
  }) as typeof fetch;
  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  try {
    const engine = new GeminiFlashLiteOpenRouterTranslationEngine({
      glossaryProtection: {
        protect: () => Promise.resolve(protectedText),
      },
    });

    const result = await engine.translate(createGeminiRequest());

    assert.equal(result.status, "translated");
    assert.equal(result.finalText, "Используйте shell в Project Manager.");
    assert.equal(result.originalText, "Use shell in Project Manager.");
    assert.equal(prompts.length, 1);
    assert.equal(prompts[0]?.includes("Use [[CAIHUB_TERM_0]]"), true);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalOpenRouterApiKey === undefined) {
      Reflect.deleteProperty(process.env, "OPENROUTER_API_KEY");
    } else {
      process.env.OPENROUTER_API_KEY = originalOpenRouterApiKey;
    }
  }
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
  assert.equal(ids.includes("apple-native"), true);
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

test("buildCoreTranslationEngines registers LM Studio local models discovered through the CLI", async () => {
  await withFakeLmStudioCli(() => {
    const engines = buildCoreTranslationEngines({});
    assert.equal(
      engines.some(
        (engine) => engine.id === "lmstudio:mlx-community/factory-test"
      ),
      true
    );
  });
});

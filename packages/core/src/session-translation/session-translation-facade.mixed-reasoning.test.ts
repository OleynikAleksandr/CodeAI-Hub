import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  type LocalizationRuntimeBootstrapSnapshot,
  resolveLocalizationPaths,
} from "@codeai-hub/localization";
import type {
  TranslationFacade,
  TranslationRequest,
} from "@codeai-hub/translation";
import { Logger } from "../telemetry/logger";
import { SessionTranslationFacade } from "./session-translation-facade";

const createTempHomeDirectory = async (): Promise<string> =>
  mkdtemp(path.join(tmpdir(), "codeai-hub-session-translation-mixed-"));

const createSettingsSnapshot = (): Record<string, unknown> => ({
  general: {
    localization: {
      categories: {
        reasoning: "ru",
      },
      defaultLanguage: "en",
      engineId: "anthropic-claude-haiku-4-5",
      reasoningEngineId: "anthropic-claude-haiku-4-5",
      workflowTermsPolicy: "keep_english",
    },
  },
});

const createBootstrapSnapshot = (): LocalizationRuntimeBootstrapSnapshot => ({
  cacheKey: "session-translation-mixed-reasoning-bootstrap",
  generatedAt: "2026-06-16T12:00:00.000Z",
  runtimePayload: {
    activeEngineId: "anthropic-claude-haiku-4-5",
    availableEngines: [
      {
        engineId: "anthropic-claude-haiku-4-5",
        languages: [{ code: "ru", label: "Russian" }],
      },
    ],
    resolvedBundlesByCategory: {
      interactive_templates: {
        entries: {},
        language: "ru",
        source: "materialized",
      },
      system_feedback: {
        entries: {},
        language: "ru",
        source: "materialized",
      },
      ui_interface: {
        entries: {},
        language: "en",
        source: "source_fallback",
      },
      user_guidance: {
        entries: {},
        language: "ru",
        source: "materialized",
      },
      workflow_terms: {
        entries: {},
        language: "en",
        source: "source_fallback",
      },
    },
  },
  schemaVersion: 1,
  settings: {
    categories: {
      interactive_templates: "ru",
      system_feedback: "ru",
      ui_interface: "en",
      user_guidance: "ru",
      workflow_terms: "en",
    },
    defaultLanguage: "en",
    engineId: "anthropic-claude-haiku-4-5",
    workflowTermsPolicy: "keep_english",
  },
});

const writeSettingsAndBootstrap = async (
  homeDirectory: string
): Promise<string> => {
  const settingsPath = path.join(
    homeDirectory,
    ".codeai-hub",
    "settings",
    "settings.json"
  );
  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(
    settingsPath,
    `${JSON.stringify(createSettingsSnapshot(), null, 2)}\n`,
    "utf8"
  );
  const bootstrapPath =
    resolveLocalizationPaths(homeDirectory).browserRuntimeBootstrapFilePath;
  await mkdir(path.dirname(bootstrapPath), { recursive: true });
  await writeFile(
    bootstrapPath,
    `${JSON.stringify(createBootstrapSnapshot(), null, 2)}\n`,
    "utf8"
  );
  return settingsPath;
};

test("SessionTranslationFacade translates mixed-language reasoning chunks", async () => {
  const homeDirectory = await createTempHomeDirectory();
  try {
    const settingsPath = await writeSettingsAndBootstrap(homeDirectory);
    let recordedRequest: TranslationRequest | undefined;
    const facade = new SessionTranslationFacade({
      logger: new Logger("error"),
      settingsPath,
      translationFacadeFactory: () =>
        ({
          translate: (request: TranslationRequest) => {
            recordedRequest = request;
            return Promise.resolve({
              engine: "anthropic-claude-haiku-4-5",
              finalText:
                'Следует ли определять "самый новый" только по времени изменения файла?',
              originalText: request.text,
              sourceLanguage: "en",
              status: "translated",
              targetLanguage: "ru",
              translatedText:
                'Следует ли определять "самый новый" только по времени изменения файла?',
            });
          },
        }) as unknown as TranslationFacade,
    });

    const content =
      'Should "newest" be determined by file modification time only? Questionnaire says "по дате изменения файла".';
    const outcome = await facade.translateDialogMessage({
      content,
      messageId: "msg-mixed-reasoning",
      providerId: "glmOpenCode",
      role: "thinking",
      sessionId: "sess-mixed-reasoning",
      tag: "thinking",
    });

    assert.ok(recordedRequest);
    assert.equal(recordedRequest.text, content);
    assert.equal(outcome?.translatedContent.includes("Следует ли"), true);
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

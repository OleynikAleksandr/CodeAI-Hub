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
  TranslationReporter,
  TranslationRequest,
  TranslationResult,
} from "@codeai-hub/translation";
import { Logger } from "../telemetry/logger";
import {
  SessionTranslationFacade,
  type SessionTranslationFacadeFactory,
} from "./session-translation-facade";

const createTempHomeDirectory = async (): Promise<string> =>
  mkdtemp(path.join(tmpdir(), "codeai-hub-session-translation-facade-"));

const createSettingsSnapshot = (): Record<string, unknown> => ({
  general: {
    localization: {
      categories: {
        artifactsForTheUser: "ru",
        interactiveTemplates: "ru",
        messagesForTheUser: "ru",
        systemFeedback: "ru",
        uiHelperText: "ru",
        uiInterface: "en",
        uiLabels: "en",
        userGuidance: "ru",
        workflowTerms: "en",
      },
      defaultLanguage: "en",
      engineId: "anthropic-claude-haiku-4-5",
      workflowTermsPolicy: "keep_english",
    },
  },
});

const createBootstrapSnapshot = (): LocalizationRuntimeBootstrapSnapshot => ({
  cacheKey: "session-translation-facade-bootstrap",
  generatedAt: "2026-04-15T12:00:00.000Z",
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
        entries: { "artifact.ready": "Готово" },
        language: "ru",
        source: "materialized",
      },
      system_feedback: {
        entries: { "status.ready": "Готово" },
        language: "ru",
        source: "materialized",
      },
      ui_interface: {
        entries: { "button.open": "Открыть" },
        language: "en",
        source: "source_fallback",
      },
      user_guidance: {
        entries: { "settings.hint": "Подсказка" },
        language: "ru",
        source: "materialized",
      },
      workflow_terms: {
        entries: { "term.workflow": "workflow" },
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

const createSilentLogger = (): Logger => new Logger("error");

interface RecordedFactoryCall {
  readonly reporter?: TranslationReporter;
}

const createRecordingFactory = (
  recorded: RecordedFactoryCall[],
  result: TranslationResult
): SessionTranslationFacadeFactory => {
  return (options) => {
    recorded.push({ reporter: options.reporter });
    const fakeFacade: Pick<TranslationFacade, "translate"> = {
      translate: (_request: TranslationRequest) => Promise.resolve(result),
    };
    return fakeFacade as TranslationFacade;
  };
};

test("SessionTranslationFacade routes through the injected translation factory", async () => {
  const homeDirectory = await createTempHomeDirectory();
  try {
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

    const recorded: RecordedFactoryCall[] = [];
    const facade = new SessionTranslationFacade({
      logger: createSilentLogger(),
      settingsPath,
      translationFacadeFactory: createRecordingFactory(recorded, {
        engine: "anthropic-claude-haiku-4-5",
        finalText: "Привет",
        originalText: "Hello",
        sourceLanguage: "en",
        status: "translated",
        targetLanguage: "ru",
        translatedText: "Привет",
      }),
    });

    const outcome = await facade.translateDialogMessage({
      content: "Hello",
      messageId: "msg-1",
      providerId: "claude",
      role: "thinking",
      sessionId: "sess-1",
      tag: "thinking",
    });

    assert.equal(recorded.length, 1);
    assert.equal(typeof recorded[0]?.reporter, "object");
    assert.equal(outcome?.translatedContent, "Привет");
    assert.equal(outcome?.targetLanguage, "ru");
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

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
import type { Logger } from "../telemetry/logger";
import { SessionTranslationFacade } from "./session-translation-facade";

const createTempHomeDirectory = async (): Promise<string> =>
  mkdtemp(path.join(tmpdir(), "codeai-hub-session-translation-guards-"));

const createSettingsSnapshot = (): Record<string, unknown> => ({
  general: {
    localization: {
      categories: {
        artifactsForTheUser: "ru",
        interactiveTemplates: "ru",
        messagesForTheUser: "ru",
        reasoning: "ru",
        systemFeedback: "ru",
        uiHelperText: "ru",
        uiInterface: "en",
        uiLabels: "en",
        userGuidance: "ru",
        workflowTerms: "en",
      },
      defaultLanguage: "en",
      engineId: "anthropic-claude-haiku-4-5",
      reasoningEngineId: "anthropic-claude-haiku-4-5",
      uiEngineId: "anthropic-claude-haiku-4-5",
      workflowTermsPolicy: "keep_english",
    },
  },
});

const createBootstrapSnapshot = (): LocalizationRuntimeBootstrapSnapshot => ({
  cacheKey: "session-translation-guards-bootstrap",
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

interface RecordedLogEntry {
  readonly context?: Record<string, unknown>;
  readonly message: string;
}

const createCapturingLogger = (): {
  readonly info: RecordedLogEntry[];
  readonly logger: Logger;
  readonly warn: RecordedLogEntry[];
} => {
  const info: RecordedLogEntry[] = [];
  const warn: RecordedLogEntry[] = [];
  return {
    info,
    logger: {
      info: (message: string, context?: Record<string, unknown>) => {
        info.push({ message, context });
      },
      warn: (message: string, context?: Record<string, unknown>) => {
        warn.push({ message, context });
      },
    } as unknown as Logger,
    warn,
  };
};

test("SessionTranslationFacade skips ordinary assistant dialog before any localization check", async () => {
  const homeDirectory = await createTempHomeDirectory();
  try {
    const settingsPath = await writeSettingsAndBootstrap(homeDirectory);
    const logger = createCapturingLogger();
    let translateCalls = 0;
    const facade = new SessionTranslationFacade({
      logger: logger.logger,
      settingsPath,
      translationFacadeFactory: () =>
        ({
          translate: () => {
            translateCalls += 1;
            return Promise.resolve({
              engine: "anthropic-claude-haiku-4-5",
              finalText: "Не должно вызываться",
              originalText: "Готово — файл записан.",
              sourceLanguage: "en",
              status: "translated" as const,
              targetLanguage: "ru",
              translatedText: "Не должно вызываться",
            });
          },
        }) as unknown as TranslationFacade,
    });

    const outcome = await facade.translateDialogMessage({
      content:
        "Я ознакомлюсь с тестовыми заметками, а затем напишу Final_Description.md.",
      messageId: "msg-assistant-skip",
      providerId: "glmOpenCode",
      role: "assistant",
      sessionId: "sess-assistant-skip",
    });

    assert.equal(outcome, null);
    assert.equal(translateCalls, 0);
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

test("SessionTranslationFacade discards translation output that leaks localization markers", async () => {
  const homeDirectory = await createTempHomeDirectory();
  try {
    const settingsPath = await writeSettingsAndBootstrap(homeDirectory);
    const logger = createCapturingLogger();
    const facade = new SessionTranslationFacade({
      logger: logger.logger,
      settingsPath,
      translationFacadeFactory: () =>
        ({
          translate: (request: TranslationRequest) =>
            Promise.resolve({
              engine: "anthropic-claude-haiku-4-5",
              finalText:
                "__CODEAI_HUB_LOCALIZATION_ENTRY__0__START__\nГотово\n__CODEAI_HUB_LOCALIZATION_ENTRY__0__END__",
              originalText: request.text,
              sourceLanguage: "en",
              status: "translated" as const,
              targetLanguage: "ru",
              translatedText:
                "__CODEAI_HUB_LOCALIZATION_ENTRY__0__START__\nГотово\n__CODEAI_HUB_LOCALIZATION_ENTRY__0__END__",
            }),
        }) as unknown as TranslationFacade,
    });

    const outcome = await facade.translateDialogMessage({
      content: "Ready.",
      messageId: "msg-marker-leak",
      providerId: "glmOpenCode",
      role: "thinking",
      sessionId: "sess-marker-leak",
      tag: "thinking",
    });

    assert.equal(outcome, null);
    assert.equal(
      logger.warn.some(
        (entry) =>
          entry.message ===
          "Session translation discarded marker-corrupted output"
      ),
      true
    );
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

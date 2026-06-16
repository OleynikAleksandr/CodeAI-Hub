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
import { loadReasoningTranslationEngineId } from "../config/provider-settings-snapshot";
import { Logger } from "../telemetry/logger";
import { resolveTranslationRuntimeMetadata } from "../translation/claude-haiku-translation-engine";
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

const writeSettingsAndBootstrap = async (
  homeDirectory: string,
  settingsSnapshot: Record<string, unknown> = createSettingsSnapshot()
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
    `${JSON.stringify(settingsSnapshot, null, 2)}\n`,
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

const createSilentLogger = (): Logger => new Logger("error");

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
    const settingsPath = await writeSettingsAndBootstrap(homeDirectory);
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

test("SessionTranslationFacade gives short reasoning translations at least 15 seconds", async () => {
  const homeDirectory = await createTempHomeDirectory();
  try {
    const settingsPath = await writeSettingsAndBootstrap(homeDirectory);
    let recordedRequest: TranslationRequest | undefined;
    const facade = new SessionTranslationFacade({
      logger: createSilentLogger(),
      settingsPath,
      translationFacadeFactory: () =>
        ({
          translate: (request: TranslationRequest) => {
            recordedRequest = request;
            return Promise.resolve({
              engine: "anthropic-claude-haiku-4-5",
              finalText: "Коротко",
              originalText: request.text,
              sourceLanguage: "en",
              status: "translated",
              targetLanguage: "ru",
              translatedText: "Коротко",
            });
          },
        }) as unknown as TranslationFacade,
    });

    const outcome = await facade.translateDialogMessage({
      content: "Short reasoning paragraph.",
      messageId: "msg-timeout",
      providerId: "codex",
      role: "assistant",
      sessionId: "sess-timeout",
      tag: "thinking",
    });

    assert.equal(outcome?.translatedContent, "Коротко");
    assert.ok(recordedRequest);
    assert.equal(
      recordedRequest.timeoutMs,
      15_000 + "Short reasoning paragraph.".length * 8
    );
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

test("SessionTranslationFacade skips Core system messages", async () => {
  const homeDirectory = await createTempHomeDirectory();
  try {
    const settingsPath = await writeSettingsAndBootstrap(homeDirectory);
    let translateCalls = 0;
    const facade = new SessionTranslationFacade({
      logger: createSilentLogger(),
      settingsPath,
      translationFacadeFactory: () =>
        ({
          translate: () => {
            translateCalls += 1;
            return Promise.resolve({
              engine: "anthropic-claude-haiku-4-5",
              finalText: "Не должно вызываться",
              originalText: "Core accepted the artifact.",
              sourceLanguage: "en",
              status: "translated",
              targetLanguage: "ru",
              translatedText: "Не должно вызываться",
            });
          },
        }) as unknown as TranslationFacade,
    });

    const outcome = await facade.translateDialogMessage({
      content: "Core accepted the artifact.",
      messageId: "core-msg-1",
      role: "system",
      sessionId: "sess-core",
      tag: "managed-workflow-continuation",
    });

    assert.equal(outcome, null);
    assert.equal(translateCalls, 0);
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

test("SessionTranslationFacade skips visible assistant dialog", async () => {
  const homeDirectory = await createTempHomeDirectory();
  try {
    const settingsPath = await writeSettingsAndBootstrap(homeDirectory);
    let translateCalls = 0;
    const facade = new SessionTranslationFacade({
      logger: createSilentLogger(),
      settingsPath,
      translationFacadeFactory: () =>
        ({
          translate: () => {
            translateCalls += 1;
            return Promise.resolve({
              engine: "anthropic-claude-haiku-4-5",
              finalText: "Проверю заметки.",
              originalText: "I need to check the referenced notes.",
              sourceLanguage: "en",
              status: "translated",
              targetLanguage: "ru",
              translatedText: "Проверю заметки.",
            });
          },
        }) as unknown as TranslationFacade,
    });

    const outcome = await facade.translateDialogMessage({
      content: "I need to check the referenced notes.",
      messageId: "assistant-visible",
      providerId: "kimi",
      role: "assistant",
      sessionId: "sess-visible",
    });

    assert.equal(outcome, null);
    assert.equal(translateCalls, 0);
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

test("SessionTranslationFacade reuses an in-flight translation for duplicate reasoning text", async () => {
  const homeDirectory = await createTempHomeDirectory();
  try {
    const settingsPath = await writeSettingsAndBootstrap(homeDirectory);
    const logger = createCapturingLogger();
    let resolveTranslation: ((value: TranslationResult) => void) | undefined;
    let translateCalls = 0;

    const facade = new SessionTranslationFacade({
      logger: logger.logger,
      settingsPath,
      translationFacadeFactory: () =>
        ({
          translate: () => {
            translateCalls += 1;
            return new Promise<TranslationResult>((resolve) => {
              resolveTranslation = resolve;
            });
          },
        }) as unknown as TranslationFacade,
    });

    const firstPromise = facade.translateDialogMessage({
      content: "Repeat me",
      messageId: "msg-1",
      providerId: "codex",
      role: "assistant",
      sessionId: "sess-1",
      tag: "thinking",
    });
    const secondPromise = facade.translateDialogMessage({
      content: "Repeat me",
      messageId: "msg-2",
      providerId: "codex",
      role: "assistant",
      sessionId: "sess-1",
      tag: "thinking",
    });

    await Promise.resolve();
    assert.equal(translateCalls, 1);
    assert.ok(resolveTranslation);
    resolveTranslation({
      engine: "anthropic-claude-haiku-4-5",
      finalText: "Повтори меня",
      originalText: "Repeat me",
      sourceLanguage: "en",
      status: "translated",
      targetLanguage: "ru",
      translatedText: "Повтори меня",
    });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    assert.equal(first?.translatedContent, "Повтори меня");
    assert.equal(second?.translatedContent, "Повтори меня");
    assert.equal(first?.messageId, "msg-1");
    assert.equal(second?.messageId, "msg-2");
    assert.equal(translateCalls, 1);
    assert.equal(
      logger.info.some(
        (entry) =>
          entry.message === "Session translation reused in-flight result"
      ),
      true
    );
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

test("SessionTranslationFacade logs requested and resolved runtime metadata for Haiku mismatches", async () => {
  const homeDirectory = await createTempHomeDirectory();
  try {
    const settingsPath = await writeSettingsAndBootstrap(homeDirectory);
    const logger = createCapturingLogger();
    const facade = new SessionTranslationFacade({
      logger: logger.logger,
      settingsPath,
      translationFacadeFactory: createRecordingFactory([], {
        engine: "google-gtx",
        errorCode: "no_engine",
        finalText: "Hello",
        originalText: "Hello",
        sourceLanguage: "en",
        status: "fallback",
        targetLanguage: "ru",
        translatedText: null,
      }),
    });

    const outcome = await facade.translateDialogMessage({
      content: "Hello",
      messageId: "msg-2",
      providerId: "claude",
      role: "thinking",
      sessionId: "sess-2",
      tag: "thinking",
    });

    assert.equal(outcome, null);
    const mismatchLog = logger.warn.find(
      (entry) =>
        entry.message === "Session translation returned non-translated result"
    );
    assert.ok(mismatchLog);
    const expectedEngineId = loadReasoningTranslationEngineId(settingsPath);
    const expectedMetadata =
      resolveTranslationRuntimeMetadata(expectedEngineId);
    assert.equal(mismatchLog.context?.requestedEngineId, expectedEngineId);
    assert.equal(mismatchLog.context?.resolvedEngineId, "google-gtx");
    assert.equal(
      mismatchLog.context?.requestedEngineModelId,
      expectedMetadata.modelId
    );
    assert.equal(
      mismatchLog.context?.requestedEngineProjectSlug,
      expectedMetadata.projectSlug
    );
    assert.equal(
      mismatchLog.context?.requestedEnginePersistSession,
      expectedMetadata.persistSession
    );
    assert.equal(
      mismatchLog.context?.requestedEngineRuntimePath,
      expectedMetadata.runtimePath
    );
    assert.equal(
      mismatchLog.context?.requestedEngineProviderId,
      expectedMetadata.providerId
    );
    assert.equal(mismatchLog.context?.resolvedEngineProviderId, null);
    assert.equal(mismatchLog.context?.resolvedEngineRuntimePath, null);
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  type LocalizationRuntimeBootstrapSnapshot,
  resolveLocalizationPaths,
} from "@codeai-hub/localization";
import { SessionTranslationPolicyResolver } from "./session-translation-policy-resolver";

const createTempHomeDirectory = async (): Promise<string> =>
  mkdtemp(path.join(tmpdir(), "codeai-hub-session-translation-"));

const buildSettingsPath = (homeDirectory: string): string =>
  path.join(homeDirectory, ".codeai-hub", "settings", "settings.json");

const createSettingsSnapshot = (
  overrides?: Record<string, unknown>
): Record<string, unknown> => ({
  general: {
    localization: {
      defaultLanguage: "en",
      categories: {
        uiLabels: "en",
        uiHelperText: "ru",
        messagesForTheUser: "ru",
        reasoning: "ru",
        artifactsForTheUser: "ru",
        interactiveTemplates: "ru",
        systemFeedback: "ru",
        uiInterface: "en",
        userGuidance: "ru",
        workflowTerms: "en",
        ...((overrides?.categories as Record<string, unknown>) ?? {}),
      },
      workflowTermsPolicy: "keep_english",
      uiEngineId: "codex-gpt-5.3-codex-spark",
      reasoningEngineId: "google-gtx",
      ...overrides,
    },
  },
});

const createBootstrapSnapshot = (): LocalizationRuntimeBootstrapSnapshot => ({
  cacheKey: "session-translation-bootstrap",
  generatedAt: "2026-04-14T12:26:39.528Z",
  runtimePayload: {
    activeEngineId: "codex-gpt-5.3-codex-spark",
    availableEngines: [
      {
        engineId: "codex-gpt-5.3-codex-spark",
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
    engineId: "codex-gpt-5.3-codex-spark",
    workflowTermsPolicy: "keep_english",
  },
});

test("SessionTranslationPolicyResolver enables translation through the dedicated reasoning engine when the persisted UI bootstrap matches the UI engine", async () => {
  const homeDirectory = await createTempHomeDirectory();

  try {
    const settingsPath = buildSettingsPath(homeDirectory);
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

    const resolver = new SessionTranslationPolicyResolver();
    const policy = resolver.resolve(settingsPath);

    assert.deepEqual(policy, {
      enabled: true,
      engineId: "google-gtx",
      skipReason: null,
      sourceLanguage: "en",
      targetLanguage: "ru",
    });
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
  }
});

test("SessionTranslationPolicyResolver keeps translation disabled while the persisted UI bootstrap is missing, but still exposes the reasoning engine on the policy", async () => {
  const homeDirectory = await createTempHomeDirectory();

  try {
    const settingsPath = buildSettingsPath(homeDirectory);
    await mkdir(path.dirname(settingsPath), { recursive: true });
    await writeFile(
      settingsPath,
      `${JSON.stringify(createSettingsSnapshot(), null, 2)}\n`,
      "utf8"
    );

    const resolver = new SessionTranslationPolicyResolver();
    const policy = resolver.resolve(settingsPath);

    assert.deepEqual(policy, {
      enabled: false,
      engineId: "google-gtx",
      skipReason: "localization_sync_pending",
      sourceLanguage: "en",
      targetLanguage: "ru",
    });
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
  }
});

test("SessionTranslationPolicyResolver decouples reasoning language from Messages for the User language", async () => {
  const homeDirectory = await createTempHomeDirectory();

  try {
    const settingsPath = buildSettingsPath(homeDirectory);
    await mkdir(path.dirname(settingsPath), { recursive: true });
    await writeFile(
      settingsPath,
      `${JSON.stringify(
        createSettingsSnapshot({
          categories: {
            messagesForTheUser: "ru",
            reasoning: "fr",
            systemFeedback: "ru",
          },
        }),
        null,
        2
      )}\n`,
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

    const resolver = new SessionTranslationPolicyResolver();
    const policy = resolver.resolve(settingsPath);

    assert.equal(policy.targetLanguage, "fr");
    assert.equal(policy.engineId, "google-gtx");
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
  }
});

test("SessionTranslationPolicyResolver falls back to the Messages for the User language when reasoning category is not yet persisted (legacy migration)", async () => {
  const homeDirectory = await createTempHomeDirectory();

  try {
    const settingsPath = buildSettingsPath(homeDirectory);
    await mkdir(path.dirname(settingsPath), { recursive: true });
    const legacySettings = createSettingsSnapshot();
    const legacyLocalization = (
      (legacySettings.general as Record<string, unknown>)
        .localization as Record<string, unknown>
    ).categories as Record<string, unknown>;
    legacyLocalization.reasoning = undefined;
    await writeFile(
      settingsPath,
      `${JSON.stringify(legacySettings, null, 2)}\n`,
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

    const resolver = new SessionTranslationPolicyResolver();
    const policy = resolver.resolve(settingsPath);

    assert.equal(policy.targetLanguage, "ru");
    assert.equal(policy.engineId, "google-gtx");
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
  }
});

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

const createSettingsSnapshot = (): Record<string, unknown> => ({
  general: {
    localization: {
      defaultLanguage: "en",
      categories: {
        uiLabels: "en",
        uiHelperText: "ru",
        messagesForTheUser: "ru",
        artifactsForTheUser: "ru",
        interactiveTemplates: "ru",
        systemFeedback: "ru",
        uiInterface: "en",
        userGuidance: "ru",
        workflowTerms: "en",
      },
      workflowTermsPolicy: "keep_english",
      engineId: "codex-gpt-5.3-codex-spark",
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

test("SessionTranslationPolicyResolver enables translation when the persisted bootstrap exists under the canonical CodeAI root", async () => {
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
      engineId: "codex-gpt-5.3-codex-spark",
      skipReason: null,
      sourceLanguage: "en",
      targetLanguage: "ru",
    });
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
  }
});

test("SessionTranslationPolicyResolver keeps translation disabled while the persisted bootstrap is missing", async () => {
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
      engineId: "codex-gpt-5.3-codex-spark",
      skipReason: "localization_sync_pending",
      sourceLanguage: "en",
      targetLanguage: "ru",
    });
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import type {
  ClaudeHaikuTranslationService,
  ClaudeHaikuTranslationServiceResult,
} from "@codeai-hub/claude-module";
import type { LocalizationRuntimeSettingsSnapshot } from "@codeai-hub/localization";
import type { TranslationRequest } from "@codeai-hub/translation";
import { createCoreLocalizationFacade } from "./core-localization-facade-factory";

const STRUCTURED_ENTRY_PATTERN =
  /(__CODEAI_HUB_LOCALIZATION_ENTRY__\d+__START__)\n([\s\S]*?)\n(__CODEAI_HUB_LOCALIZATION_ENTRY__\d+__END__)/g;

const translateStructuredBatch = (text: string): string =>
  text.replace(
    STRUCTURED_ENTRY_PATTERN,
    (_match, startMarker: string, body: string, endMarker: string) =>
      `${startMarker}\n[ru] ${body.trim()}\n${endMarker}`
  );

const createFakeService = (): ClaudeHaikuTranslationService =>
  ({
    translate: (
      request: TranslationRequest
    ): Promise<ClaudeHaikuTranslationServiceResult> =>
      Promise.resolve({
        text: translateStructuredBatch(request.text),
      }),
  }) as unknown as ClaudeHaikuTranslationService;

const createRuntimeSettings = (): LocalizationRuntimeSettingsSnapshot => ({
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
});

test("createCoreLocalizationFacade keeps labels in English while materializing helper categories through Haiku", async () => {
  const facade = createCoreLocalizationFacade({
    claudeHaikuTranslationService: createFakeService(),
    sourceDictionaries: [
      {
        category: "interactive_templates",
        entries: {
          "artifact.help.body": "Artifact Help",
        },
        language: "en",
      },
      {
        category: "system_feedback",
        entries: {
          "pm.description.help.title": "Description Help",
        },
        language: "en",
      },
      {
        category: "ui_interface",
        entries: {
          "settings.header.title": "Settings",
        },
        language: "en",
      },
      {
        category: "user_guidance",
        entries: {
          "settings.localization.intro": "Helper Intro",
        },
        language: "en",
      },
      {
        category: "workflow_terms",
        entries: {
          "term.workflow": "Workflow",
        },
        language: "en",
      },
    ],
  });

  const snapshot = await facade.resolveRuntimeBootstrapSnapshot(
    createRuntimeSettings()
  );

  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.user_guidance.language,
    "ru"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.user_guidance.source,
    "materialized"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.user_guidance.entries[
      "settings.localization.intro"
    ],
    "[ru] Helper Intro"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.system_feedback.language,
    "ru"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.system_feedback.entries[
      "pm.description.help.title"
    ],
    "[ru] Description Help"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.interactive_templates
      .language,
    "ru"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.interactive_templates
      .entries["artifact.help.body"],
    "[ru] Artifact Help"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.ui_interface.language,
    "en"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.ui_interface.source,
    "source_fallback"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.ui_interface.entries[
      "settings.header.title"
    ],
    "Settings"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.workflow_terms.language,
    "en"
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import type { LocalizationRuntimeSettingsSnapshot } from "@codeai-hub/localization";
import {
  createLocalizationRuntimeSettingsSnapshot,
  matchesLocalizationRuntimeSettingsSnapshot,
} from "./localization-runtime-settings-snapshot";
import { DEFAULT_SETTINGS_SNAPSHOT, type SettingsSnapshot } from "./types";

const withLocalization = (
  snapshot: SettingsSnapshot,
  overrides: Partial<SettingsSnapshot["general"]["localization"]>
): SettingsSnapshot => ({
  ...snapshot,
  general: {
    ...snapshot.general,
    localization: {
      ...snapshot.general.localization,
      ...overrides,
      categories: {
        ...snapshot.general.localization.categories,
        ...(overrides.categories ?? {}),
      },
    },
  },
});

test("runtime snapshot uses canonical five-category shape", () => {
  const settings = withLocalization(DEFAULT_SETTINGS_SNAPSHOT, {
    engineId: "anthropic-claude-haiku-4-5",
    categories: {
      artifactsForTheUser: "ru",
      interactiveTemplates: "ru",
      messagesForTheUser: "de",
      systemFeedback: "de",
      uiHelperText: "uk",
      uiInterface: "en",
      uiLabels: "fr",
      userGuidance: "uk",
      workflowTerms: "fr",
    },
  });

  const snapshot = createLocalizationRuntimeSettingsSnapshot(settings);

  assert.deepEqual(snapshot.categories, {
    interactive_templates: "ru",
    system_feedback: "de",
    ui_interface: "fr",
    user_guidance: "uk",
    workflow_terms: "fr",
  });
});

test("runtime snapshot matcher accepts canonical core bootstrap payload", () => {
  const localSnapshot = createLocalizationRuntimeSettingsSnapshot(
    withLocalization(DEFAULT_SETTINGS_SNAPSHOT, {
      engineId: "anthropic-claude-haiku-4-5",
    })
  );
  const coreSnapshot: LocalizationRuntimeSettingsSnapshot = {
    categories: {
      interactive_templates: "en",
      system_feedback: "en",
      ui_interface: "en",
      user_guidance: "en",
      workflow_terms: "en",
    },
    defaultLanguage: "en",
    engineId: "anthropic-claude-haiku-4-5",
    workflowTermsPolicy: "keep_english",
  };

  assert.equal(
    matchesLocalizationRuntimeSettingsSnapshot(coreSnapshot, localSnapshot),
    true
  );
});

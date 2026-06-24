import assert from "node:assert/strict";
import test from "node:test";
import { LocalizationSettingsImpactClassifier } from "./localization-settings-impact-classifier";
import { DEFAULT_SETTINGS_SNAPSHOT, type SettingsSnapshot } from "./types";

const cloneSnapshot = (snapshot: SettingsSnapshot): SettingsSnapshot => ({
  general: {
    ...snapshot.general,
    localization: {
      ...snapshot.general.localization,
      categories: { ...snapshot.general.localization.categories },
    },
  },
  providers: {
    claude: { ...snapshot.providers.claude },
    codex: { ...snapshot.providers.codex },
  },
});

const withCategory = (
  snapshot: SettingsSnapshot,
  overrides: Partial<SettingsSnapshot["general"]["localization"]["categories"]>
): SettingsSnapshot => {
  const next = cloneSnapshot(snapshot);
  return {
    ...next,
    general: {
      ...next.general,
      localization: {
        ...next.general.localization,
        categories: { ...next.general.localization.categories, ...overrides },
      },
    },
  };
};

test("classifier returns no impact when only provider settings change", () => {
  const classifier = new LocalizationSettingsImpactClassifier();
  const previous = DEFAULT_SETTINGS_SNAPSHOT;
  const base = cloneSnapshot(previous);
  const next: SettingsSnapshot = {
    ...base,
    providers: {
      ...base.providers,
      claude: {
        ...base.providers.claude,
        thinkingDisplaySyncEnabled: false,
      },
    },
  };

  const impact = classifier.classify(previous, next);

  assert.equal(impact.kind, "none");
  assert.deepEqual(impact.changedGroups, []);
});

test("classifier returns engine impact when translation engine id changes", () => {
  const classifier = new LocalizationSettingsImpactClassifier();
  const previous = DEFAULT_SETTINGS_SNAPSHOT;
  const base = cloneSnapshot(previous);
  const next: SettingsSnapshot = {
    ...base,
    general: {
      ...base.general,
      localization: {
        ...base.general.localization,
        engineId: "codex-gpt-5.4-mini",
      },
    },
  };

  const impact = classifier.classify(previous, next);

  assert.equal(impact.kind, "engine");
});

test("classifier returns engine impact when glossary enabled flag flips", () => {
  const classifier = new LocalizationSettingsImpactClassifier();
  const previous = DEFAULT_SETTINGS_SNAPSHOT;
  const base = cloneSnapshot(previous);
  const next: SettingsSnapshot = {
    ...base,
    general: {
      ...base.general,
      localization: {
        ...base.general.localization,
        glossaryEnabled: !previous.general.localization.glossaryEnabled,
      },
    },
  };

  const impact = classifier.classify(previous, next);

  assert.equal(impact.kind, "engine");
});

test("classifier lists only the changed approved groups for single-category saves", () => {
  const classifier = new LocalizationSettingsImpactClassifier();
  const previous = withCategory(DEFAULT_SETTINGS_SNAPSHOT, {
    uiLabels: "en",
    messagesForTheUser: "en",
  });
  const next = withCategory(previous, {
    messagesForTheUser: "ru",
  });

  const impact = classifier.classify(previous, next);

  assert.equal(impact.kind, "categories");
  assert.deepEqual(impact.changedGroups, ["messages_for_the_user"]);
});

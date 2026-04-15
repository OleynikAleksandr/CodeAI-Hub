import assert from "node:assert/strict";
import test from "node:test";
import { LocalizationSelectiveSyncPlanner } from "./localization-selective-sync-planner";
import type { LocalizationSaveImpact } from "./localization-settings-impact-classifier";
import { DEFAULT_SETTINGS_SNAPSHOT, type SettingsSnapshot } from "./types";

const withCategories = (
  snapshot: SettingsSnapshot,
  overrides: Partial<SettingsSnapshot["general"]["localization"]["categories"]>
): SettingsSnapshot => ({
  ...snapshot,
  general: {
    ...snapshot.general,
    localization: {
      ...snapshot.general.localization,
      categories: { ...snapshot.general.localization.categories, ...overrides },
    },
  },
});

test("planner returns empty plan for no-impact saves", () => {
  const planner = new LocalizationSelectiveSyncPlanner();
  const impact: LocalizationSaveImpact = { kind: "none", changedGroups: [] };

  const plan = planner.plan(impact, DEFAULT_SETTINGS_SNAPSHOT);

  assert.equal(plan.rebuildScope, "none");
  assert.deepEqual(plan.affectedRuntimeBundleIds, []);
  assert.deepEqual(plan.affectedApprovedGroups, []);
});

test("planner rebuilds every non-English approved group for engine changes", () => {
  const planner = new LocalizationSelectiveSyncPlanner();
  const settings = withCategories(DEFAULT_SETTINGS_SNAPSHOT, {
    uiLabels: "ru",
    uiHelperText: "en",
    messagesForTheUser: "ru",
    artifactsForTheUser: "en",
  });
  const impact: LocalizationSaveImpact = { kind: "engine", changedGroups: [] };

  const plan = planner.plan(impact, settings);

  assert.equal(plan.rebuildScope, "all_non_english");
  assert.deepEqual(plan.affectedApprovedGroups, [
    "ui_labels",
    "messages_for_the_user",
  ]);
  assert.deepEqual(plan.affectedRuntimeBundleIds, [
    "ui_interface",
    "workflow_terms",
    "system_feedback",
  ]);
});

test("planner rebuilds only the affected approved group for single-category saves", () => {
  const planner = new LocalizationSelectiveSyncPlanner();
  const settings = withCategories(DEFAULT_SETTINGS_SNAPSHOT, {
    messagesForTheUser: "ru",
  });
  const impact: LocalizationSaveImpact = {
    kind: "categories",
    changedGroups: ["messages_for_the_user"],
  };

  const plan = planner.plan(impact, settings);

  assert.equal(plan.rebuildScope, "affected_only");
  assert.deepEqual(plan.affectedApprovedGroups, ["messages_for_the_user"]);
  assert.deepEqual(plan.affectedRuntimeBundleIds, ["system_feedback"]);
});

test("planner fans UI Labels change out to ui_interface and workflow_terms", () => {
  const planner = new LocalizationSelectiveSyncPlanner();
  const settings = withCategories(DEFAULT_SETTINGS_SNAPSHOT, {
    uiLabels: "ru",
  });
  const impact: LocalizationSaveImpact = {
    kind: "categories",
    changedGroups: ["ui_labels"],
  };

  const plan = planner.plan(impact, settings);

  assert.equal(plan.rebuildScope, "affected_only");
  assert.deepEqual(plan.affectedRuntimeBundleIds, [
    "ui_interface",
    "workflow_terms",
  ]);
});

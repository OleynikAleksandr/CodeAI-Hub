# Localization Incremental Sync and Thinking Visibility Architecture

**Status:** Draft for review (2026-04-15)
**Created:** 2026-04-15
**Updated:** 2026-04-15
**Owner:** Oleksandr + Codex
**Scope:** Narrow settings-save localization rebuilds to engine/category diffs only, classify visible provider thinking/reasoning under `Messages for the User`, and stop translating hidden thinking bubbles while keeping re-enable behavior forward-only.

---

## 1. Problem

The current save path for Settings is too coarse and mixes three different concerns:

- any `Save Changes` request enters the blocking localization-sync path, even when the user changed only provider settings;
- strict localization sync currently forces the runtime bootstrap rebuild for all non-English runtime bundles, instead of rebuilding only the categories whose language or engine policy actually changed;
- live provider thinking/reasoning translation is a separate runtime overlay layer, but its visibility policy is not aligned with the provider toggles `Thinking in dialog` / `Reasoning in dialog`.

This creates concrete product problems:

1. Changing only provider defaults, continuity thresholds, or display toggles still shows `Synchronizing localization` and blocks Project Manager/new-session sends.
2. Changing one localization group causes unnecessary rebuild of unrelated groups.
3. `Messages for the User` already drives the target language for visible thinking/reasoning overlays, but that ownership is not explicit enough in the user-facing explanation.
4. When Claude/Gemini visible thinking is disabled, the product still keeps the source-first thinking path alive and can still spend work on translation logic for text that the user never sees.
5. Because current Session UI filtering is based on the current settings state instead of an emission-time visibility contract, old hidden thinking can become visible later when the toggle is re-enabled inside a long-running session.

---

## 2. Product Goal

The target behavior is:

1. Provider-only save: no localization sync, no localization blocking overlay, no Project Manager send/create block.
2. Translation engine change: strict rebuild of every non-English user-facing localization group.
3. Single-group language change: strict rebuild only of that group's runtime bundle set.
4. `UI Labels` remains a two-bundle runtime set: `ui_interface + workflow_terms`.
5. `Messages for the User` documentation and Settings helper copy explicitly include visible provider `Thinking / Reasoning`.
6. If `Thinking in dialog` / `Reasoning in dialog` is off for a provider, visible thinking/reasoning translation is also off for that provider.
7. Re-enabling the toggle inside an ongoing session is forward-only: only newly emitted thinking/reasoning after the toggle turns on becomes visible and eligible for translation. Old hidden thinking must not be backfilled, retranslated, or suddenly revealed.

---

## 3. Non-Goals

This scope does not:

- introduce a fifth user-facing localization category;
- translate canonical provider-native transcripts or rewrite provider raw logs;
- retroactively translate or reveal hidden historical thinking after the user enables a display toggle again;
- change `Internal Agent Instructions` boundaries;
- redesign the browser localization bundle taxonomy in the same stream;
- change provider-native model/thinking semantics beyond the visibility/translation gate described here.

---

## 4. Core Decisions

### 4.1. Settings save must classify localization impact before blocking sync

Before the extension enters the blocking strict sync path, it must compare the previous persisted settings snapshot with the requested next snapshot and classify the save into one of these outcomes:

- `no_localization_impact`
- `engine_changed`
- `categories_changed`

`no_localization_impact` means:

- provider-only changes;
- response-mode changes;
- continuity changes;
- any other settings change that does not affect the active browser localization runtime payload or visible thinking/reasoning translation policy.

For `no_localization_impact`, the save path must persist settings and return a non-strict runtime payload resolution path without entering the localization busy state.

### 4.2. Only localization-impacting fields participate in rebuild planning

This planning scope treats these values as localization-impacting:

- `general.localization.engineId`
- approved category selections:
  - `UI Labels`
  - `UI Helper Text`
  - `Messages for the User`
  - `Artifacts for the User`
- provider-specific visible thinking/reasoning display gate only for live overlay eligibility, not for browser bundle rebuilds

This planning scope does not require provider settings to trigger browser bundle rebuilds.

### 4.3. Runtime bundle ownership remains mapped from four approved groups

The approved product groups remain:

- `UI Labels`
- `UI Helper Text`
- `Messages for the User`
- `Artifacts for the User`

The runtime bridge keeps the existing compatibility taxonomy, so rebuild planning must resolve the affected runtime bundle set as:

- `UI Labels` -> `ui_interface` and `workflow_terms`
- `UI Helper Text` -> `user_guidance`
- `Messages for the User` -> `system_feedback`
- `Artifacts for the User` -> `interactive_templates`

This means a single `UI Labels` language change is still one approved-group change but two runtime-bundle rebuilds.

### 4.4. Translation engine change rebuilds every non-English group

If the selected translation engine changes, the save path must strict-rebuild every runtime bundle whose configured language is not source / English.

Examples:

- `UI Labels = ru`, `Messages for the User = ru`, others = `en` -> rebuild `ui_interface`, `workflow_terms`, and `system_feedback`
- all groups = `en` -> no translated runtime bundles need materialization, so there is no cross-category translation work to perform

### 4.5. Single-group language change rebuilds only that group

If the engine stays the same and only one approved group changes language, strict rebuild is limited to that group's runtime bundle set:

- `UI Labels` change -> rebuild only `ui_interface + workflow_terms`
- `UI Helper Text` change -> rebuild only `user_guidance`
- `Messages for the User` change -> rebuild only `system_feedback`
- `Artifacts for the User` change -> rebuild only `interactive_templates`

Unrelated groups must keep their existing materialized bundles.

### 4.6. `Messages for the User` explicitly owns visible Thinking / Reasoning

The explanatory contract for `Messages for the User` must explicitly include visible provider `Thinking / Reasoning` bubbles.

Why:

- these bubbles are runtime communication shown to the user;
- their target language already follows `Messages for the User`;
- this is not a new category, only a clearer statement of existing ownership.

This clarification applies to:

- contract wording;
- Localization module wording;
- Settings helper copy for the localization card.

### 4.7. Live thinking/reasoning translation stays a separate runtime layer

The browser localization bundle system and the live session translation overlay remain separate layers:

- browser bundle rebuilds materialize product-authored localization categories;
- live thinking/reasoning translation remains a Core-owned overlay over provider output.

However, the overlay must continue to inherit:

- target language from `Messages for the User`;
- engine from `Translation engine`.

The save-path rules above change browser rebuild scope, not the fact that the live overlay consumes those two settings.

### 4.8. Hidden visible-thinking means hidden translation

If a provider's visible thinking/reasoning toggle is off, the product must not spend translation work on visible-thinking overlay messages for that provider.

Provider-specific intent:

- `Codex`: `Reasoning in dialog = off` already means the provider does not emit visible reasoning summaries, so there is nothing to translate.
- `Claude` / `Gemini`: when the display toggle is off, hidden thinking must not enter the visible translation queue even if provider/native storage paths continue to exist for diagnostics or raw continuity reasons.

### 4.9. Re-enable must be forward-only inside a long-running session

When the user turns visible thinking/reasoning back on during an ongoing session:

- only newly emitted thinking/reasoning after that moment becomes visible;
- only newly emitted visible thinking/reasoning after that moment is eligible for translation;
- previously hidden thinking must remain hidden;
- no retroactive translation/backfill job is allowed.

This requires an immutable visibility-at-emission contract instead of relying only on the current settings flag during replay/render.

### 4.10. Visibility must be decided at emission time, not replay time

The current UI filtering model is settings-driven at render time. This scope replaces that behavior for provider thinking/reasoning with an emission-time visibility contract.

Acceptable target-state implementations:

1. hidden thinking is omitted from the user-visible unified session/dialog transcript entirely; or
2. hidden thinking remains persisted in a non-user-visible transcript path but carries immutable metadata that prevents later replay/render and translation when the toggle changes.

In both variants, provider-native raw logs may remain unchanged. The non-negotiable requirement is user-visible behavior:

- no translation for hidden thinking;
- no retro-reveal after re-enable.

---

## 5. Target Save Matrix

| User change | Browser localization sync | Rebuilt runtime bundles | Live thinking/reasoning effect |
| --- | --- | --- | --- |
| Provider-only setting | No | None | Only future provider behavior changes that are unrelated to browser localization |
| Translation engine | Strict | Every non-English approved group | Future visible thinking/reasoning uses the new engine |
| `UI Labels` language | Strict | `ui_interface`, `workflow_terms` | No cross-category browser rebuild |
| `UI Helper Text` language | Strict | `user_guidance` | No cross-category browser rebuild |
| `Messages for the User` language | Strict | `system_feedback` | Future visible thinking/reasoning changes target language accordingly |
| `Artifacts for the User` language | Strict | `interactive_templates` | No effect on visible thinking/reasoning |
| Claude/Gemini display toggle off | No browser rebuild by itself | None | Stop translating newly emitted hidden thinking |
| Claude/Gemini display toggle on | No browser rebuild by itself | None | Only newly emitted thinking becomes visible/translatable |
| Codex `Reasoning in dialog` off/on | No browser rebuild by itself | None | Provider-level reasoning availability changes for future turns |

---

## 6. Structural Plan

This scope should be implemented through small dedicated helpers instead of expanding existing handlers:

### 6.1. Settings save classification

The Settings save path now routes every save through a dedicated classifier:

- `LocalizationSettingsImpactClassifier` lives in `src/extension-module/settings/localization-settings-impact-classifier.ts`.

Current responsibilities:

- compare the previous persisted settings snapshot with the requested next snapshot;
- decide whether blocking localization sync is needed at all;
- distinguish `engine`, `categories`, and `none` outcomes;
- return the changed approved groups for the `categories` outcome.

The classifier treats changes to `general.localization.engineId` and `general.localization.glossaryEnabled` as `engine`-class impact, changes to any of the four approved category selections (`uiLabels`, `uiHelperText`, `messagesForTheUser`, `artifactsForTheUser`) as `categories` impact, and anything else (provider settings, `responsePolicy`, continuity, core controls) as `none`.

### 6.2. Selective localization strict sync planning

Selective sync planning is now an extension-module helper that sits between the classifier and the localization facade:

- `LocalizationSelectiveSyncPlanner` lives in `src/extension-module/settings/localization-selective-sync-planner.ts`.

Current responsibilities:

- take a `LocalizationSaveImpact` plus the next settings snapshot and return a `LocalizationSelectiveSyncPlan`;
- for `engine`-class impact, list every runtime bundle whose owning approved group is not English (`rebuildScope: "all_non_english"`);
- for `categories`-class impact, list only the runtime bundles owned by the changed approved groups (`rebuildScope: "affected_only"`);
- preserve the existing `UI Labels -> ui_interface + workflow_terms` rule while keeping the other three approved groups mapped 1:1 onto `user_guidance`, `system_feedback`, and `interactive_templates` respectively.

The planner is a pure projection from settings + impact to runtime-bundle ids. It does not perform any materialization work itself — the selective materialization contract (`LocalizationFacade.synchronizeRuntimePayload(settings, options)` accepting the plan) is introduced in the next stream.

### 6.3. Thinking visibility eligibility

Introduce a focused visibility policy seam for live overlay candidates, for example:

- `SessionThinkingVisibilityPolicy`

Responsibilities:

- resolve whether a newly emitted thinking/reasoning message is user-visible at emission time;
- gate translation dispatch for hidden thinking;
- provide a stable answer for replay/re-render so later settings changes do not reclassify old messages.

### 6.4. Session/dialog contract update

The session/dialog message contract needs one immutable visibility decision for provider thinking/reasoning messages, either as:

- explicit message metadata; or
- omission from the user-visible transcript path.

This contract must be honored consistently in:

- live session stream updates;
- dialog history replay;
- virtual conversation / continuation merge;
- `localizedContent` overlay application.

---

## 7. Acceptance Criteria

This planning scope is complete when the implementation later proves all of the following:

1. Saving only provider settings does not show `Synchronizing localization`.
2. Saving only provider settings does not block Project Manager session creation or message send.
3. Changing `Translation engine` strict-rebuilds all non-English approved groups and only those groups.
4. Changing one approved localization group rebuilds only that group's runtime bundle set.
5. `Messages for the User` explanatory copy explicitly includes visible `Thinking / Reasoning`.
6. Hidden provider thinking/reasoning is not translated.
7. Re-enabling the display toggle in an ongoing session does not reveal old hidden thinking.
8. Only newly emitted visible thinking/reasoning after re-enable can appear and receive translation.
9. No regression reintroduces a full browser-localization rebuild for unrelated settings saves.

---

## 8. Related SSOT

- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
- `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

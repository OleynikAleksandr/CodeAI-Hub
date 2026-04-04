# UI Localization And Local Glossary Architecture

**Status:** Proposed planning doc
**Created:** 2026-04-01
**Owner:** Oleksandr + Codex
**Scope:** User-selectable interface localization for CodeAI Hub using materialized locale bundles and a local glossary/protected-terms layer on top of the existing shared translation module

---

## 1. Problem

CodeAI Hub already has an implemented shared runtime translation capability:

- `packages/translation/`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`

That module currently solves short runtime translation for provider reasoning text.
It does not solve full product localization.

Current product gaps:

1. The application has no universal language interface for UI surfaces.
2. User-visible text is spread across React components, templates, help blocks, notifications, and workflow documents.
3. The current source copy is mixed:
   - some product text is authored in English;
   - some product text is authored in Russian;
   - some surfaces are already partially localized by hand.
4. This mixed-source state blocks a clean localization pipeline.
5. Pure render-time translation is undesirable because it is network-dependent, harder to control, and wastes runtime resources.
6. Google GTX is good enough for general text, but it corrupts product terms and branded names such as `Gemini`, `Codex`, `Project Manager`, and workflow labels unless we protect them locally.

This scope exists to define a stable architecture for UI localization without introducing a paid-cloud onboarding burden for end users.

---

## 2. Product Goal

The user must be able to open `General Settings` and choose how different product text categories are shown:

- keep the original product language;
- or materialize a translation into a chosen target language.

This must work without translating every render in real time.

Target product behavior:

1. CodeAI Hub keeps canonical source copy in English.
2. Localized bundles are generated once and stored in user data.
3. Application updates must not wipe generated localization data.
4. The UI reads already-materialized bundles instead of calling the translator during every render.
5. Technical terms, provider names, workflow labels, file names, and environment variables must stay protected by a local glossary/protected-terms layer.

---

## 3. Core Decision

CodeAI Hub must use a two-layer localization architecture:

1. `@codeai-hub/translation` remains translation-only.
2. A new localization layer owns:
   - source dictionaries;
   - glossary/protected-terms handling;
   - language selection;
   - bundle generation;
   - persistence of localized catalogs;
   - UI-facing string resolution.

This scope explicitly rejects direct render-time translation as the primary localization path.

Primary strategy:

- translate once;
- persist the result;
- reuse the persisted bundle until the source dictionary changes.

---

## 4. Source Language Invariant

Before localization rollout starts, CodeAI Hub must normalize its canonical product copy to English.

This is a mandatory first implementation stream, not an optional cleanup.

Reason:

- localization pipelines need one canonical source language;
- glossary rules and source hashes are unstable if source text is half Russian and half English;
- a mixed-source system creates ambiguous semantics for "original language".

Canonical source-language rule:

1. All source UI copy, help text, templates, forms, and user-editable product documents that belong to the application surface must be authored in English.
2. Russian or any other language must exist only as:
   - generated localization bundles;
   - historical archived documents;
   - user content written by the user or by providers.

Examples that must become English source copy:

- questionnaire templates;
- step help blocks;
- settings labels and descriptions;
- empty-state copy;
- status banners;
- recovery banners;
- extension notifications;
- workflow-facing built-in templates delivered by the product.

---

## 5. Localization Categories

The user-facing localization settings must expose these five categories.

### 5.1 `user_guidance`

Includes:

- help panels;
- hints;
- onboarding text;
- explanatory copy;
- intermediate "what is happening now" banners;
- guidance above forms and steps.

### 5.2 `ui_interface`

Includes:

- main Project Manager UI;
- Session UI;
- Settings UI;
- buttons;
- labels;
- tabs;
- section titles;
- menus;
- control descriptions.

### 5.3 `workflow_terms`

Includes:

- workflow step names;
- artifact labels;
- development-tree labels;
- product taxonomy terms such as `Description`, `Virtual Simulation`, `Artifacts`, `Help`.

This category must support a separate policy:

- `translate`
- `keep_english`

### 5.4 `system_feedback`

Includes:

- errors;
- warnings;
- success/info notifications;
- status messages;
- empty states;
- restart/recovery banners;
- continuity/recovery/system messages rendered by the product.

### 5.5 `interactive_templates`

Includes:

- questionnaires;
- built-in forms;
- user-fill templates;
- product-authored editable documents that the user fills in.

For this category the canonical source must be English, and localized versions must be materialized from that English source.

---

## 6. Out Of Scope For UI Localization

The following content must not be treated as generic UI localization payload:

- provider model outputs;
- provider reasoning/thinking content;
- provider-native raw logs;
- model names;
- provider ids;
- CLI commands;
- environment variables;
- file paths;
- raw technical ids;
- user-authored content.

These surfaces may be translated in other scopes, but not by the base UI localization pipeline.

---

## 7. Storage Model

User-owned mutable localization data must live under `~/.codeai-hub/`.
It must not live inside the installed extension bundle.

Recommended storage layout:

- `~/.codeai-hub/settings/settings.json`
- `~/.codeai-hub/localization/`
- `~/.codeai-hub/localization/metadata.json`
- `~/.codeai-hub/localization/catalogs/<category>/<language>.json`
- `~/.codeai-hub/localization/glossary/base.json`
- `~/.codeai-hub/localization/glossary/<language>.json`
- `~/.codeai-hub/localization/glossary/user-overrides.json`
- `~/.codeai-hub/localization/cache/`

Responsibility split:

- `settings.json` stores user choices and localization policy.
- `localization/catalogs` stores generated translated bundles.
- `localization/glossary` stores protected-term rules and approved term mappings.
- `metadata.json` stores source hashes, schema version, generation timestamps, and engine info.
- `user-overrides.json` stores user-managed terms that must not be translated or must use a user-approved preferred mapping.

Application updates must preserve the entire `~/.codeai-hub/localization/` tree.

---

## 8. Source Dictionaries

The product needs immutable bundled English source dictionaries.

Recommended bundled location:

- `assets/localization/source/en/<category>.json`

These bundled dictionaries are the source of truth for localization generation.

Each dictionary entry must use a stable message id:

```json
{
  "settings.general.core_controls.title": "Core Controls",
  "settings.general.core_controls.restart_button": "Restart Core"
}
```

Rules:

1. UI components must not be the source of truth for localized copy.
2. Components should resolve strings by message id via a localization facade/hook.
3. Dictionary keys must stay stable across releases whenever the semantics stay the same.

---

## 9. Settings Contract

Localization belongs to user settings.

Recommended shape inside `settings.json`:

```json
{
  "general": {
    "localization": {
      "defaultLanguage": "source",
      "categories": {
        "userGuidance": "source",
        "uiInterface": "source",
        "workflowTerms": "source",
        "systemFeedback": "source",
        "interactiveTemplates": "source"
      },
      "workflowTermsPolicy": "keep_english",
      "engineId": "google-gtx",
      "glossaryEnabled": true
    }
  }
}
```

Notes:

- `"source"` means "show canonical English source copy".
- Any non-source value is a target language code such as `ru`, `es`, `de`.
- The available language list must come from the localization engine catalog, not from a hardcoded React list.
- The glossary payload itself should not be stored inline in `settings.json`; settings own the policy and editor entry point, while glossary data lives in dedicated localization files.

---

## 10. Localization Module Boundary

This scope should introduce a new module boundary instead of expanding `@codeai-hub/translation` beyond translation responsibilities.

Recommended package:

- `packages/localization/`

Recommended package role:

- source dictionary loading;
- language catalog exposure;
- glossary/protected-terms application;
- localized bundle materialization;
- hash/metadata tracking;
- localized string lookup.

The shared translation module remains a dependency of this package, not the owner of localization persistence.

Recommended public facade:

- `LocalizationFacade`

Recommended responsibilities behind the facade:

- `SourceDictionaryRegistry`
- `LanguageCatalogService`
- `GlossaryProtector`
- `LocalizationMaterializer`
- `LocalizationBundleStore`
- `LocalizationLookupService`
- `LocalizationMetadataStore`

---

## 11. Local Glossary / Protected Terms Layer

Because the current Google GTX path does not support Google-managed glossaries in our implementation, CodeAI Hub must implement a local glossary/protected-terms layer.

This layer must run before and after translation.

### 11.1 Term classes

The glossary layer must support at least:

1. `preserve`
   The term must stay unchanged.

2. `preferred_translation`
   The translated term must be replaced with an approved product translation.

3. `category_override`
   The rule applies only for specific localization categories.

4. `user_override`
   A user-authored rule that has higher priority than bundled default glossary entries.

Examples of terms that are expected to be `preserve` by default:

- `Claude`
- `Codex`
- `Gemini`
- `Project Manager`
- `Core`
- `React Flow`
- `CLI`
- `SDK`
- `CODEX_HOME`
- `module-map.md`
- `facade-map.md`

The initial bundled glossary baseline is described in:

- `doc/SolidWorks-WorkFlow/Plans/Archive/UI_Localization_Glossary_Baseline.md`

### 11.2 Processing pipeline

1. Detect protected terms in the source string.
2. Replace them with stable translation-safe markers.
3. Send the protected string to the translation engine.
4. Restore the protected terms after translation.
5. Apply approved term overrides if required.

Resolution order:

1. bundled base glossary;
2. bundled language-specific glossary;
3. category policy such as `workflowTermsPolicy`;
4. user overrides from `~/.codeai-hub/localization/glossary/user-overrides.json`.

### 11.3 Marker requirement

Marker format must be validated experimentally against Google GTX before implementation.

This is important because some marker formats can be mutated by the translation engine.

---

## 12. Performance Strategy

Localization generation is a build-on-demand user-data operation, not a render-path operation.

Rules:

1. UI render must read from already materialized bundles.
2. Translation calls happen only when:
   - a category/language is enabled for the first time;
   - source hashes changed after an update;
   - glossary rules changed and invalidated a bundle.

Required optimizations:

- persistent cache;
- dedupe identical source strings across dictionaries;
- incremental regeneration by source hash;
- non-blocking background materialization when possible.

This keeps the localization experience cheap and stable even with the current free translation engine.

---

## 13. Language Catalog Rule

The language picker must list languages supported by the active localization engine/capability.

The product must not maintain an arbitrary handcrafted "favorite languages only" list for this scope.

Implication:

- the localization module must expose a canonical language catalog;
- Settings UI reads that catalog;
- engine upgrades can expand the list without rewriting the settings UI contract.

---

## 14. User-Managed Glossary

The product must allow the user to extend the glossary without editing repo files manually.

Required behavior:

1. Settings UI provides an entry point to a glossary editor or glossary management surface.
2. The user can enter English terms that must not be translated.
3. The user can later remove or edit those terms.
4. User glossary changes invalidate affected localized bundles and trigger incremental regeneration.
5. User overrides must never be overwritten by application updates.

Minimum first-wave capability:

- `do-not-translate` English terms entered by the user.

Possible later extension:

- user-defined preferred translations per language.

---

## 15. UI Consumption Contract

UI code must move toward a message-id-based access pattern.

Example:

```ts
const title = localization.t("settings.general.core_controls.title");
```

Not allowed as the final architecture:

- hardcoded product copy scattered across components as the primary source;
- direct runtime translation in React render;
- category/language decisions embedded inside individual components.

---

## 16. Migration Strategy

### Phase 0. English source normalization

- convert canonical product-owned UI/help/template text to English;
- identify and freeze localizable source surfaces.

### Phase 1. Source dictionaries and lookup plumbing

- extract strings from selected surfaces into bundled English dictionaries;
- introduce localization lookup in UI.

### Phase 2. User settings and persisted localization bundles

- add localization settings contract;
- generate and store localized bundles under `~/.codeai-hub/localization/`.

### Phase 3. Local glossary/protected-terms pipeline

- protect provider names, workflow terms, file names, and other technical tokens;
- validate marker behavior against the current Google GTX engine.
- wire user-managed `do-not-translate` terms into the same pipeline.

### Phase 4. Incremental update and invalidation rules

- regenerate only changed categories/languages after updates;
- preserve user data across extension upgrades.

---

## 17. Risks

1. Mixed-language source copy can corrupt the entire localization baseline.
2. Product terms can be mistranslated unless protected locally.
3. Unstable message ids can force unnecessary full regeneration after updates.
4. If components keep raw strings inline, localization coverage will remain partial and drift-prone.
5. Over-localizing workflow taxonomy can confuse advanced users unless `workflowTermsPolicy` is explicit.
6. If user glossary overrides are not validated, malformed terms can break marker replacement or produce inconsistent localized bundles.

---

## 18. Decisions Locked By This Planning Doc

1. Canonical product source copy must be English.
2. Localization is materialized and persisted, not primarily render-time.
3. User localization data lives under `~/.codeai-hub/` and survives updates.
4. `@codeai-hub/translation` stays translation-only.
5. A local glossary/protected-terms layer is required for the current Google GTX path.
6. Localization settings are category-based, with a separate policy for workflow terms.
7. Users must be able to add their own English `do-not-translate` terms through the product UI.

---

## 19. Related Docs

- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
- `doc/SolidWorks-WorkFlow/Plans/Archive/UI_Localization_Glossary_Baseline.md`

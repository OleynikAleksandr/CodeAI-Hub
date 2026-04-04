# Localization — Module (SSOT)

**Status:** Implemented on `main`
**Updated:** 2026-04-04
**Owner:** Oleksandr + Codex
**Validated on:** `main` (`v1.1.881`)

---

## 1. Purpose

`packages/localization/` is the persistent UI localization layer for CodeAI Hub.

It exists to localize product-authored UI copy without translating every render in real time.

Current responsibilities:

- bundled English source dictionaries for product-owned copy;
- engine-backed language catalog exposure;
- glossary / protected-terms handling;
- localized bundle materialization and persistence;
- metadata/hash tracking for incremental regeneration;
- browser-runtime payload contracts, resolved bundle snapshots, and startup-ready bootstrap snapshots for UI lookup;
- category ownership between `UI Labels`, `UI Helper Text`, `Messages for the User`, and `Artifacts for the User`, while `Internal Agent Instructions` stay outside user-facing materialization.

This module depends on `@codeai-hub/translation`, but it is a separate boundary.

---

## 2. Boundary

`Localization` owns:

- source dictionaries under `assets/localization/source/en/`;
- localization categories and source-language invariant;
- glossary baselines and user override storage;
- bundle persistence under `~/.codeai-hub/localization/`;
- bundle reuse / invalidation via metadata hash;
- resolved runtime payload snapshots keyed by category/language/engine policy;
- persisted browser bootstrap snapshots used for first paint on cold start.

`Localization` does not own:

- translation transport details (`@codeai-hub/translation` owns that);
- provider outputs, reasoning text, or user-authored content;
- extension/core/browser transport that delivers runtime payloads to specific UI surfaces;
- workflow/business semantics outside localized copy itself.

---

## 3. Package Shape

Package root:

- `packages/localization/`

Current high-signal files:

- `src/localization-contract.ts` — category ids, source dictionary types, engine catalog types, runtime payload contracts.
- `src/source-dictionary-registry.ts` — bundled source catalog registration and lookup.
- `src/language-catalog.ts`, `src/language-catalog-service.ts` — engine language catalog exposure.
- `src/glossary-contract.ts`, `src/glossary-merge-service.ts`, `src/glossary-protector.ts`, `src/glossary-validator.ts` — glossary and protected-term pipeline.
- `src/user-glossary-store.ts` — user-managed seeded glossary text file for English preserve terms.
- `src/localization-paths.ts` — canonical `~/.codeai-hub/localization/` layout.
- `src/localization-bundle-store.ts` — persisted bundle read/write.
- `src/localization-runtime-bootstrap-store.ts` — persisted startup-ready browser localization snapshot read/write.
- `src/localization-metadata-store.ts` — source-hash metadata and regeneration reuse contract.
- `src/localization-materializer.ts` — materialization pipeline over `TranslationFacade`.
- `src/localization-facade.ts` — public package entrypoint plus runtime payload/bootstrap resolution and reuse.

Bundled assets:

- approved live user-facing dictionaries:
  - `assets/localization/source/en/ui_labels.json`
  - `assets/localization/source/en/ui_helper_text.json`
  - `assets/localization/source/en/messages_for_the_user.json`
  - `assets/localization/source/en/artifacts_for_the_user.json`
- bridge/compat source dictionaries still shipped during the migration layer:
  - `assets/localization/source/en/ui_interface.json`
  - `assets/localization/source/en/system_feedback.json`
  - `assets/localization/source/en/user_guidance.json`
  - `assets/localization/source/en/workflow_terms.json`
  - `assets/localization/source/en/interactive_templates.json`
- `assets/localization/glossary/base.json`
- `assets/localization/glossary/ru.json`

---

## 4. Data Model

Canonical source language:

- `en`

Approved live user-facing text categories:

- `ui_labels`
- `ui_helper_text`
- `messages_for_the_user`
- `artifacts_for_the_user`

Approved non-user-facing text marker:

- `internal_agent_instructions` (English-only; not part of user language settings)

Legacy runtime categories kept only as compatibility aliases during the bridge migration:

- `ui_interface`
- `user_guidance`
- `workflow_terms`
- `system_feedback`
- `interactive_templates`

User-owned mutable data lives under:

- `~/.codeai-hub/localization/metadata.json`
- `~/.codeai-hub/localization/catalogs/<category>/<language>.json`
- `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json`
- `~/.codeai-hub/localization/glossary/do-not-translate-terms.txt`

User settings policy lives separately in:

- `~/.codeai-hub/settings/settings.json`

Current settings contract stores:

- default language;
- per-category language selection;
- workflow terms policy (`keep_english` / `translate`);
- translation engine id;
- glossary enabled flag.

Current glossary contract stores:

- rule kinds:
  - `preserve`
  - `preferred_translation`
  - `user_preserve`
- bundled glossary sources:
  - `assets/localization/glossary/base.json`
  - `assets/localization/glossary/<language>.json`
- user-owned glossary overrides:
  - `~/.codeai-hub/localization/glossary/do-not-translate-terms.txt`
- baseline protected terms cover provider/product names, technical brands, environment/config tokens, and workflow artifact filenames; language-specific glossaries may additionally pin approved translated forms such as Russian workflow terminology.

Current user-facing settings contract:

- independent language selection for:
  - `UI Labels`
  - `UI Helper Text`
  - `Messages for the User`
  - `Artifacts for the User`
- English default/reset semantics rendered in UI as `Default Language (English)`
- no user-facing `Default language` control
- no user-facing `Workflow Terms Policy` control

Current runtime payload contract stores:

- active engine id and available engine catalogs;
- configured language per localization category;
- resolved bundle entries per category, including source fallback metadata when a persisted bundle is unavailable;
- bridge aliases so legacy runtime buckets still resolve to the approved four-category selections while the codebase finishes migration.

Current browser bootstrap snapshot contract stores:

- normalized localization settings subset used to derive runtime payloads;
- persisted `LocalizationRuntimePayload` for first browser paint;
- cache key/hash for bundle/glossary/settings/source-dictionary reuse;
- generation timestamp and schema version.

---

## 5. Materialization Pipeline

`LocalizationMaterializer` currently does the following:

1. Resolve the bundled English source dictionary by category.
2. Resolve glossary input from:
   - bundled base glossary;
   - bundled language glossary;
   - user overrides.
3. Merge glossary rules deterministically.
4. Apply workflow-terms policy filtering when needed.
5. Protect glossary terms before translation.
6. Translate unique source strings through `TranslationFacade`.
7. Restore protected terms after translation.
8. Persist bundle JSON and metadata hash.
9. Reuse an existing bundle when the composite hash still matches.
10. Assemble and persist `browser-runtime-bootstrap.json` when the requested runtime settings do not match the currently persisted startup snapshot.

Important live behaviors:

- identical source strings are deduplicated within one materialization run;
- glossary changes invalidate affected bundles through the metadata hash;
- `targetLanguage = source` or `targetLanguage = en` returns source entries without persistence;
- current default engine id is `google-gtx`.
- matching runtime settings now reuse the persisted browser bootstrap snapshot instead of rebuilding startup payloads unconditionally.
- workflow-created user-facing artifact shell text and brief user-facing workflow chat updates may follow the configured `Artifacts for the User` language, but internal prompt assets remain outside Localization materialization and stay English-only.

---

## 6. UI Consumption

Current browser-side lookup runtime:

- `src/client/ui/src/app-host/use-localization.ts`

Current host/bridge hydration surfaces:

- `src/extension-module/settings/localization-runtime-service.ts`
- `src/extension-module/message-handlers/settings-message-handler.ts`
- `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`
- `src/core/webview-module/webview-html-generator.ts`
- `packages/core/src/remote-bridge/handlers/localization-bootstrap-http-handler.ts`

Current consumers:

- settings-only host and shared settings UI in `src/client/ui/src/`
- localized PM help/questionnaire/navigation surfaces in `src/client/project-manager/`

Current live browser behavior:

- browser surfaces resolve copy by message id through the shared lookup helper;
- extension settings load/save and Project Manager settings load materialize a `LocalizationRuntimePayload` through `LocalizationFacade.resolveRuntimePayload(...)`;
- the localization package also persists a startup-ready browser bootstrap snapshot under `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json`;
- Settings WebView reads that snapshot through HTML bootstrap injection (`window.__CODEAI_LOCALIZATION_BOOTSTRAP__`) before JS mounts;
- Project Manager reads the same persisted snapshot through core HTTP endpoint `/api/v1/localization/bootstrap` before `root.render(...)`;
- settings webview and Project Manager app root feed that payload into the shared `LocalizationProvider`, so localized surfaces do not resolve bundles independently;
- the Settings glossary card no longer keeps an inline browser draft; it opens `~/.codeai-hub/localization/glossary/do-not-translate-terms.txt` in the current VS Code window and lets the user edit one preserve term per line;
- Project Manager help/questionnaire/navigation leaves now consume the shared provider instead of reloading settings in each localized component;
- the browser runtime no longer embeds bundled English source catalogs as the live data source; translated and source bundles come from persisted/bootstrap or host-resolved payloads, while component-level fallback strings are only a last-resort safety path;
- the settings card exposes engine catalogs through a constrained selector and language catalogs through a searchable combobox; the visible `English` source choice persists as canonical `source`.

---

## 7. Invariants

1. Product-owned localizable source copy must live in bundled English dictionaries, not in React components.
2. User-owned mutable localization data must live under `~/.codeai-hub/localization/`, not inside the installed extension bundle.
3. `@codeai-hub/translation` remains translation-only and must not absorb persistence/glossary/UI lookup concerns.
4. Glossary protection must be able to preserve branded names, technical terms, env vars, and workflow vocabulary.
5. Lookup keys must remain stable when the semantics stay the same.
6. Browser/UI surfaces must consume host-materialized localization runtime payloads instead of reading mutable localization files directly.
7. If a valid persisted browser bootstrap snapshot exists, browser startup must reuse it for first paint instead of briefly flashing English source copy and repainting later.
8. Every text created or shown by the product must carry an explicit text category marker; automatic category guessing is not allowed.
9. `Internal Agent Instructions` must stay outside user-facing localization settings and remain English-only unless a separate technical contract explicitly says otherwise.
10. `Artifacts for the User` may influence workflow-created artifact shell text and brief user-facing chat updates, but it must not be used to translate internal prompt bodies or hidden provider instructions.

---

## 8. Verification Notes

Current validation surface:

- `npm run build --workspace @codeai-hub/localization`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run build:project-manager`

Release verification additionally relies on:

- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

---

## 9. Related Docs

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

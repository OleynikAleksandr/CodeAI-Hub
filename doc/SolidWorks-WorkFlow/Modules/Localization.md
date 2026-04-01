# Localization — Module (SSOT)

**Status:** Implemented on `main`
**Updated:** 2026-04-01
**Owner:** Oleksandr + Codex
**Validated on:** `main` (`v1.1.864`)

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
- browser-facing dictionary lookup primitives.

This module depends on `@codeai-hub/translation`, but it is a separate boundary.

---

## 2. Boundary

`Localization` owns:

- source dictionaries under `assets/localization/source/en/`;
- localization categories and source-language invariant;
- glossary baselines and user override storage;
- bundle persistence under `~/.codeai-hub/localization/`;
- bundle reuse / invalidation via metadata hash;
- UI lookup helpers that resolve message ids to product copy.

`Localization` does not own:

- translation transport details (`@codeai-hub/translation` owns that);
- provider outputs, reasoning text, or user-authored content;
- browser-to-runtime delivery of user-data bundles beyond the current lookup helper;
- workflow/business semantics outside localized copy itself.

---

## 3. Package Shape

Package root:

- `packages/localization/`

Current high-signal files:

- `src/localization-contract.ts` — category ids, source dictionary types, engine catalog types.
- `src/source-dictionary-registry.ts` — bundled source catalog registration and lookup.
- `src/language-catalog.ts`, `src/language-catalog-service.ts` — engine language catalog exposure.
- `src/glossary-contract.ts`, `src/glossary-merge-service.ts`, `src/glossary-protector.ts`, `src/glossary-validator.ts` — glossary and protected-term pipeline.
- `src/user-glossary-store.ts` — user-managed English preserve terms.
- `src/localization-paths.ts` — canonical `~/.codeai-hub/localization/` layout.
- `src/localization-bundle-store.ts` — persisted bundle read/write.
- `src/localization-metadata-store.ts` — source-hash metadata and regeneration reuse contract.
- `src/localization-materializer.ts` — materialization pipeline over `TranslationFacade`.
- `src/localization-facade.ts` — public package entrypoint.

Bundled assets:

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

Current localization categories:

- `ui_interface`
- `user_guidance`
- `workflow_terms`
- `system_feedback`
- `interactive_templates`

User-owned mutable data lives under:

- `~/.codeai-hub/localization/metadata.json`
- `~/.codeai-hub/localization/catalogs/<category>/<language>.json`
- `~/.codeai-hub/localization/glossary/user-overrides.json`

User settings policy lives separately in:

- `~/.codeai-hub/settings/settings.json`

Current settings contract stores:

- default language;
- per-category language selection;
- workflow terms policy (`keep_english` / `translate`);
- translation engine id;
- glossary enabled flag.

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

Important live behaviors:

- identical source strings are deduplicated within one materialization run;
- glossary changes invalidate affected bundles through the metadata hash;
- `targetLanguage = source` or `targetLanguage = en` returns source entries without persistence;
- current default engine id is `google-gtx`.

---

## 6. UI Consumption

Current browser-side lookup runtime:

- `src/client/ui/src/app-host/use-localization.ts`

Current consumers:

- settings-only host and shared settings UI in `src/client/ui/src/`
- localized PM help/questionnaire/navigation surfaces in `src/client/project-manager/`

Current live browser behavior:

- browser surfaces resolve copy by message id through the shared lookup helper;
- the helper currently ships bundled English source catalogs into the browser bundle;
- persisted user-data bundles from `~/.codeai-hub/localization/catalogs/` are not yet bridged into the browser runtime;
- therefore non-`source` language selections are already persisted in settings and supported by the package materializer, but current browser lookup still falls back to bundled English source catalogs until a host-side bundle delivery bridge is added.

This means the implemented module boundary is real and persistent, while the browser delivery path is intentionally still conservative in the current release.

---

## 7. Invariants

1. Product-owned localizable source copy must live in bundled English dictionaries, not in React components.
2. User-owned mutable localization data must live under `~/.codeai-hub/localization/`, not inside the installed extension bundle.
3. `@codeai-hub/translation` remains translation-only and must not absorb persistence/glossary/UI lookup concerns.
4. Glossary protection must be able to preserve branded names, technical terms, env vars, and workflow vocabulary.
5. Lookup keys must remain stable when the semantics stay the same.

---

## 8. Verification Notes

Current validation surface:

- `npm run build --workspace @codeai-hub/localization`
- `npm run build:webview`
- `npm run typecheck:webview`

Release verification additionally relies on:

- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

---

## 9. Related Docs

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- `doc/SolidWorks-WorkFlow/Plans/UI_Localization_And_Local_Glossary_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/UI_Localization_Glossary_Baseline.md`

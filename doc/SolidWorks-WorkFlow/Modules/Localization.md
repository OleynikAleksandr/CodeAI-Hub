# Localization — Module (SSOT)

**Status:** Implemented on `main`
**Updated:** 2026-04-16
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
- provider outputs, reasoning source transcripts, or user-authored content;
- runtime thinking overlay storage under unified session history (`*.translations.jsonl`);
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
- `messages_for_the_user` (also owns visible provider `Thinking / Reasoning` bubbles shown in the Session dialog; see `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md` §3.3)
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
- interface/bootstrap bundle materialization now opts into explicit `chunkingMode = "disabled"` and sends one structured marker-preserving batch request per dictionary bundle instead of per-entry translation or shared semantic chunk planning;
- `google-gtx` keeps that same structured whole-batch localization path, but long requests now switch from `GET` to `POST application/x-www-form-urlencoded` inside `GoogleTranslateClient` so large runtime bundles such as `system_feedback` do not fail closed on URL-length overflow before translation starts;
- runtime bootstrap bundle resolution no longer waits for every affected bundle to finish before starting the next one: `LocalizationFacade` resolves the runtime-priority bundle set with bounded concurrency `2`, preserving the same category-keyed payload contract while shortening cold-start/save-sync latency on slower engines such as Claude Haiku;
- bundle materialization uses dynamic watchdog timeouts plus automatic retry; strict save-sync treats missing/malformed marker segments as entry-level `partial_fallback` and does not report ready until every required entry in the selected bundle set parses successfully;
- if a structured whole-batch translation loses one specific marker segment, `LocalizationMaterializer` immediately retries that missing source string as an isolated translation request before surfacing `partial_fallback`; strict save-sync only fails when the targeted recovery still cannot produce a usable localized entry;
- glossary changes invalidate affected bundles through the metadata hash;
- `targetLanguage = source` or `targetLanguage = en` returns source entries without persistence;
- current default engine id is `google-gtx`;
- explicit `translationEngineId` requests are fail-closed: if the selected engine is unavailable in the active runtime, Localization must surface fallback/error state instead of silently substituting `google-gtx`;
- the current selectable engine set is:
  - `google-gtx`
  - `codex-gpt-5.4-mini`
  - `codex-gpt-5.3-codex-spark`
  - `anthropic-claude-haiku-4-5` (provider-owned, materialized through a strict Core-backed localization path; extension-host does not locally translate with this engine and must not downgrade to a local fallback path)
- the same persisted `translationEngineId` now also feeds Core-owned live thinking overlay translation; Localization still does not own the overlay storage or replay path, but it remains the SSOT for which engine the product selected.
- matching runtime settings now reuse the persisted browser bootstrap snapshot instead of rebuilding startup payloads unconditionally.
- Settings save-path now classifies every save through `LocalizationSettingsImpactClassifier` (in `src/extension-module/settings/localization-settings-impact-classifier.ts`) before deciding whether to enter the blocking strict sync path. Provider-only saves, `general.responsePolicy` changes, continuity-only changes, and any other setting that does not touch `general.localization.engineId`, the four approved category language selections, or the glossary-enabled flag return `no_localization_impact` and persist through a best-effort envelope without posting the localization busy overlay and without blocking Project Manager/new session sends.
- Engine and category-impacting saves enter the strict sync path but no longer force a full five-bundle rebuild. `LocalizationSelectiveSyncPlanner` projects the classified impact onto the affected runtime bundle set: engine or glossary-enabled changes plan a rebuild of every non-English approved group, while single-category changes plan a rebuild limited to that group's runtime bundles (UI Labels still fans out to `ui_interface + workflow_terms`; UI Helper Text -> `user_guidance`; Messages for the User -> `system_feedback`; Artifacts for the User -> `interactive_templates`). The plan is passed into `LocalizationFacade.synchronizeRuntimePayload(settings, { affectedRuntimeBundleIds })`; affected bundles go through the existing materialize-required path and refuse to report ready while fallback or `partial_fallback` entries remain, while non-affected bundles carry forward via the best-effort resolution path so unrelated translated bundles are reused from the persisted bootstrap snapshot instead of being rematerialized.
- Codex-backed bundle materialization now reuses warm bootstrap artifacts (`.tmp/plugins*`, `installation_id`, `skills`) from the resolved Codex home when building temp translation runtimes, so one bundle sync no longer pays repeated plugin bootstrap cost on every request.
- workflow-created user-facing artifact shell text and brief user-facing workflow chat updates may follow the configured `Artifacts for the User` language, but internal prompt assets remain outside Localization materialization and stay English-only.
- mixed DSL artifacts may keep canonical structural names/titles in English even while surrounding descriptive prose follows `Artifacts for the User`; `Diagram Modules` `Product Part` / `Cluster` / `Module` naming is the live reference case.

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
- for `anthropic-claude-haiku-4-5`, `/api/v1/localization/bootstrap` is authoritative: Core must rebuild a strict snapshot from current normalized `settings.json` before returning it, instead of serving stale persisted cache only;
- settings webview and Project Manager app root feed that payload into the shared `LocalizationProvider`, so localized surfaces do not resolve bundles independently;
- Settings `Save Changes` enters a blocking strict localization sync through `LocalizationFacade.synchronizeRuntimePayload(...)` only when the save actually changes localization-impacting fields (engine, approved category selections, or glossary-enabled flag). For those saves the settings surface stays busy and Project Manager/new session sends stay blocked until translated interface bundles are ready. Provider-only, response-policy, and continuity-only saves skip the busy overlay entirely and persist through the best-effort envelope path;
- when `anthropic-claude-haiku-4-5` is selected, extension-host save/bootstrap flows must fetch the authoritative Core snapshot and verify that the returned settings match the requested runtime settings. Missing or mismatched Core bootstrap is a blocking failure, not a reason to rematerialize helper/messages bundles locally;
- workflow prompt-pack assembly in Project Manager must treat the persisted browser bootstrap snapshot as a valid fallback source for `Artifacts for the User` language when live `settings:loaded` cache is not ready yet; reconnect/cold-start paths must not silently degrade staged artifact language back to default `en` while persisted localization state still says `ru`;
- the Settings glossary card no longer keeps an inline browser draft; it opens `~/.codeai-hub/localization/glossary/do-not-translate-terms.txt` in the current VS Code window and lets the user edit one preserve term per line;
- Project Manager help/questionnaire/navigation leaves now consume the shared provider instead of reloading settings in each localized component;
- the browser runtime no longer embeds bundled English source catalogs as the live data source; translated and source bundles come from persisted/bootstrap or host-resolved payloads, while component-level fallback strings are only a last-resort safety path;
- the settings card exposes a constrained `Translation engine` selector with `Google GTX Free`, `OpenAI Codex · GPT-5.4 Mini`, `OpenAI Codex · GPT-5.3 Codex Spark`, and `Anthropic Claude · Haiku 4.5`, plus language catalogs through a searchable combobox; the visible `English` source choice persists as canonical `source`.
- the Settings `Translation engine` selector now gates provider-owned engines by live `core:state` provider availability: `Google GTX` stays selectable without account bootstrap, while `OpenAI Codex` and `Anthropic Claude` engines render as unavailable when their backing provider stack is disconnected/degraded and surface the provider recovery/status message instead of pretending a verified subscription check exists.
- Project Manager busy/localization blocking surfaces must keep hook order invariant across `busy -> ready` transitions; blocking may hide interactive content, but it must not mount a blank renderer shell after sync completion.

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
11. Structural vocabulary inside user-facing workflow DSLs may stay English-only when that vocabulary acts as the canonical semantic identifier set for runtime parsing and rendering.

---

## 8. Verification Notes

Current validation surface:

- `npx tsx --test packages/localization/src/localization-materializer.test.ts`
- `npx tsx --test packages/translation/src/codex-translation-runtime-home-facade.test.ts`
- `npx tsx --test src/client/project-manager/components/layout/main-area-panel-content.test.ts`
- `npm run clean --workspace=@codeai-hub/translation`
- `npm run build --workspace=@codeai-hub/translation`
- `node --test packages/translation/dist/translation-chunk-boundary-resolver.test.js`
- `node --test packages/translation/dist/translation-chunk-planner.test.js`
- `node --test packages/translation/dist/translation-facade.test.js`
- `npm run build --workspace @codeai-hub/localization`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run build:project-manager`

Release verification additionally relies on:

- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

The current localization recovery baseline validates that:

- localization bundles compile after strict save-path synchronization, deterministic required-bundle ordering, and non-chunked interface materialization without changing the source-dictionary/glossary ownership boundary;
- `LocalizationMaterializationResult` now exposes counts for whole-string fallback versus `partial_fallback` among unique translation operations, so operator verification can distinguish timeout classes during future repros;
- `@codeai-hub/core`, `@codeai-hub/localization`, `build:webview`, and `typecheck:webview` still pass against the updated recovery contract;
- Core-owned live translation overlays now serialize dispatch through one shared queue and stay disabled until a matching localization bootstrap snapshot is ready for the current settings.

---

## 9. Related Docs

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

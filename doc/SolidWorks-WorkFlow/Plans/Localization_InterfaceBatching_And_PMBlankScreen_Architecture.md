# Localization Interface Batching and PM Blank Screen Recovery

**Status:** Draft
**Created:** 2026-04-14
**Owner:** Codex

---

## 1. Problem

Release `1.1.980` fixed correctness of localization save-sync, but two post-release regressions remain:

1. Interface localization save-sync is correct but too slow.
   - `settings.json` persists immediately.
   - strict runtime bootstrap synchronization completes only after the selected interface bundle finishes translation.
   - for `UI Helper Text = ru`, one save took about 5m24s.

2. Project Manager can become permanently blank after the localization busy state flips.
   - `chrome_debug.log` shows `Minified React error #300`.
   - the current PM blocking implementation changes hook execution order when `localizationSyncStatus.busy` toggles.

---

## 2. Verified Root Causes

### 2.1 Interface localization still translates per entry, not per bundle

`LocalizationMaterializer.translateSourceDictionary(...)` still iterates over every source entry and dispatches translation one text at a time.
For `user_guidance`, that means ~115 entries / ~113 unique strings and therefore ~113 Codex translation executions for one save.

This violates the approved recovery direction:
- realtime translation may use chunking / queueing;
- interface localization must prefer large whole-bundle translation requests over many small calls.

### 2.2 Codex translation temp runtime still pays repeated bootstrap cost

Each Codex translation run materializes a fresh temp `CODEX_HOME`, but only copies `auth.json` and `models_cache.json`.
The temp runtime then re-syncs plugin metadata (`git clone` into `.tmp/plugins`) during translation startup.

Even after bundle batching, this repeated bootstrap should be removed for interface localization and future save-sync work.

### 2.3 PM blocked-state implementation violates React hook invariants

`MainAreaArtifactContent` and `MainAreaSessionContent` return early on `localizationSyncStatus.busy` before calling the rest of their hooks.
When busy flips from `true` to `false`, the hook graph changes and React crashes the renderer.

---

## 3. Target Behavior

### 3.1 Interface localization execution mode

Interface localization must translate by bundle-sized batches, not per entry.

Target contract:
- one localization category -> one large structured translation request by default;
- no semantic chunk planner for interface localization;
- if the structured batch cannot be parsed back completely, the result is treated as failed / partial and strict sync must not report success;
- strict save-sync completes only after all required categories for the selected settings are materialized and persisted.

### 3.2 Structured batch transport

The translation payload must preserve message identity inside one request.
A stable marker protocol is required so the translated response can be parsed back into `{ messageId -> translatedText }` without relying on translated prose shape.

Expected properties:
- stable non-translated markers / sentinels;
- one translation call for the full batch;
- per-entry glossary protection remains compatible;
- parse failure or missing entries produce partial/fallback accounting.

### 3.3 Codex translation runtime optimization

The temp translation runtime should reuse safe provider-home bootstrap artifacts that remove repeated plugin bootstrap overhead.

Minimum optimization target:
- copy or reuse provider-home `.tmp/plugins*` artifacts into the temp runtime;
- keep the translation runtime isolated and ephemeral;
- avoid network/plugin bootstrap work during each translation call when provider-home already has the synced artifacts.

### 3.4 Project Manager blocking UX

Localization blocking may hide interactive session surfaces, but it must never crash PM or leave the renderer blank after the busy state ends.

Target contract:
- PM may render a blocked placeholder while busy;
- once busy becomes `false`, the same renderer tree continues normally;
- hook order stays invariant across busy/ready transitions.

---

## 4. Implementation Shape

### Stream A — PM blank-screen recovery

Files:
- `src/client/project-manager/components/layout/main-area-panel-content.tsx`
- optional targeted test file under `src/client/project-manager/components/layout/`

Work:
- remove early returns that precede later hooks;
- keep all hooks unconditional;
- preserve current blocked placeholder UX.

### Stream B — Bundle-level interface localization batching

Files:
- `packages/localization/src/localization-materializer.ts`
- `packages/localization/src/localization-materializer.test.ts`
- if required, one translation package file for structured batch transport

Work:
- add structured batch request building/parsing for interface localization;
- translate one batch per bundle instead of one request per entry;
- keep strict fallback accounting;
- keep glossary protection compatible.

### Stream C — Codex translation runtime bootstrap optimization

Files:
- `packages/translation/src/codex-translation-runtime-home-facade.ts`
- optional translation tests if needed

Work:
- reuse provider-home plugin bootstrap artifacts in temp translation homes;
- remove repeated plugin clone/bootstrap overhead.

### Stream D — SSOT sync and verification

Files:
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/TODO/todo-plan.md`

Work:
- document bundle-level interface batching as the active contract;
- document PM blocked-state safety invariant;
- record targeted verification.

---

## 5. Verification Target

Minimum verification for this recovery scope:
- targeted tests for PM busy->ready render safety and localization batching path;
- `npm run build --workspace=@codeai-hub/localization`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npx tsc -p . --pretty false --noEmit`

Release build is deferred until the user validates the hotfix scope.

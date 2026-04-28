# Development TODO Plan

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ModelInvocationProfiles_And_TemplateSync_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the context-pack source for the current execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task must touch no more than 3 files or packages. If real work exceeds that, split the task before editing.
- Each implementation task is followed by a separate `Git Commit: ...` item.
- Keep docs synchronized with code in the same commit when behavior or architecture changes.
- Husky gates are mandatory. Do not bypass hooks.
- Manual targeted builds are required before closing streams/phases when the touched packages warrant them:
  - `npm run build --workspace=@codeai-hub/core`
  - `npm run build --workspace=@codeai-hub/codex-module`
  - `npm run build --workspace=@codeai-hub/translation`
  - `npm run build:webview`
  - `npm run typecheck:webview`
- Phase closeout must happen on a clean tree. Release build follows the project release checklist when this execution cycle is ready to ship.
- Update this file in real time after every task and commit: status, commit hash, and any scope split.

Status values: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

---

## Phase 0 — Planning Bootstrap (owner: Codex, updated: 2026-04-28)

### Stream: Scope Activation

1. [DONE] Create accepted planning document, activate execution `todo-plan.md`, and register the active planning document in `Docs_Index.md` (scope: `doc/SolidWorks-WorkFlow/Plans/ModelInvocationProfiles_And_TemplateSync_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit: `docs: start model invocation profile execution plan`)
2. [DONE] Git Commit: `docs: start model invocation profile execution plan` (hash: `c5c48d521`)

---

## Phase 1 — Model Invocation Profile Foundation (owner: Codex, updated: 2026-04-28)

### Stream: Core Profile Contract

1. [DONE] Add provider-neutral model invocation selector/effective-profile contract and resolver scaffold; `purpose` must be only `workflow-agent | translation`, with no `diagnostic` purpose (scope: `packages/core/src/model-invocation/*`, `packages/core/src/config/*`; commit: `feat: add model invocation profile resolver`)
2. [DONE] Git Commit: `feat: add model invocation profile resolver` (hash: `ffb55c132`)
3. [DONE] Add focused resolver tests for workflow step profiles, translation profiles, and compatible model lists (scope: `packages/core/src/model-invocation/*.test.ts`, `packages/core/src/config/*.test.ts`; commit: `test: cover model invocation profile resolution`)
4. [DONE] Git Commit: `test: cover model invocation profile resolution` (hash: `b80b71d0e`)
5. [DONE] Update architecture docs for the new profile contract and the rule that native request capture is diagnostic mode over real profiles (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit: `docs: define model invocation profile contract`)
6. [DONE] Git Commit: `docs: define model invocation profile contract` (hash: `8f8e83567`)

---

## Phase 2 — Protected Text Templates (owner: Codex, updated: 2026-04-28)

### Stream: Template Sync Safety

1. [DONE] Add template sync state, bundled-content hashing, user-modified detection, and `.incoming/<version>/...` preservation for changed bundled templates (scope: `packages/core/src/templates/template-sync-service.ts`, `packages/core/src/templates/template-sync-service.test.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; commit: `feat: preserve user-modified templates`)
2. [DONE] Git Commit: `feat: preserve user-modified templates` (hash: `585a3f9fd`)
3. [DONE] Add backup + explicit resolution actions for pending template updates, keeping flags/tools unavailable to user templates (scope: `packages/core/src/templates/*`, `packages/core/src/remote-bridge/*`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; commit: `feat: add template update resolution actions`)
4. [DONE] Git Commit: `feat: add template update resolution actions` (hash: `fb851a44b`)

### Stream: Invocation Instruction Templates

5. [DONE] Add bundled text-only invocation instruction templates and a loader for user-overridden `.md` fragments (scope: `packages/core/src/templates/*`, `packages/core/src/model-invocation/*`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; commit: `feat: add invocation instruction templates`)
6. [DONE] Git Commit: `feat: add invocation instruction templates` (hash: `903a99035`)
7. [DONE] Add tests proving text templates can change instructions without exposing flags/tools/sandbox/approval controls (scope: `packages/core/src/templates/*.test.ts`, `packages/core/src/model-invocation/*.test.ts`; commit: `test: cover invocation template overrides`)
8. [DONE] Git Commit: `test: cover invocation template overrides` (hash: `032ecef6b`)

---

## Phase 3 — Settings UI For Template Updates (owner: Codex, updated: 2026-04-28)

### Stream: Template Update UI

1. [DONE] Add Project Manager/Core bridge support for loading pending template updates and applying grouped decisions (scope: `src/client/project-manager/*`, `packages/core/src/remote-bridge/*`, `packages/core/src/templates/*`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; commit: `feat: expose template update decisions`)
2. [DONE] Git Commit: `feat: expose template update decisions` (hash: `9ff72d89b`)
3. [DONE] Add Settings UI surface for grouped template decisions: preserve, replace, backup+replace, and review file-by-file (scope: `src/client/ui/src/components/settings/*`, `src/client/project-manager/components/settings/*`; commit: `feat: add template update settings UI`)
4. [DONE] Git Commit: `feat: add template update settings UI` (hash: `254cf67b2`)
5. [DONE] Run webview checks and fix UI type/style regressions if any (scope: `src/client/ui`, `src/client/project-manager`; checks: `npm run typecheck:webview`, `npm run build:webview`, `npm run build:project-manager`; commit: `fix: stabilize template update settings UI`)
6. [DONE] Git Commit: `fix: stabilize template update settings UI` (hash: `151adc68b`)

---

## Phase 4 — Codex Workflow Profile Integration (owner: Codex, updated: 2026-04-28)

### Stream: Codex App Server Profiles

1. [DONE] Introduce Codex App Server process profile keys while preserving current workflow startup flags as `codex:workflow-documentation` (scope: `packages/Codex_AppServer_Module/src/app-server/process/*`, `packages/Codex_AppServer_Module/src/app-server/*`; checks: `npm run build --workspace=@codeai-hub/codex-app-server-module`, `node --test packages/Codex_AppServer_Module/dist/app-server/process/codex-app-server-process.test.js`; commit: `feat: add codex app-server process profiles`)
2. [DONE] Git Commit: `feat: add codex app-server process profiles` (hash: `ad713d9b5`)
3. [DONE] Route Codex workflow `thread/start` and native capture workflow scenarios through the resolved workflow profile without changing current workflow behavior (scope: `packages/Codex_AppServer_Module/src/app-server/*`, `packages/Codex_AppServer_Module/src/diagnostics/*`; checks: `npm run build --workspace=@codeai-hub/codex-app-server-module`, `node --test packages/Codex_AppServer_Module/dist/app-server/codex-app-server-facade.test.js`, `node --test packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js`, `node --test packages/Codex_AppServer_Module/dist/app-server/process/codex-app-server-process.test.js`; commit: `feat: apply codex workflow invocation profile`)
4. [DONE] Git Commit: `feat: apply codex workflow invocation profile` (hash: `aa99db5b3`)
5. [DONE] Add Codex tests for profile-selected base instructions, project-doc config, summary omission for Spark, and compatible model list behavior (scope: `packages/Codex_AppServer_Module/src/**/*.test.ts`; checks: `npx ultracite check`, `npm run build --workspace=@codeai-hub/codex-app-server-module`, `node --test packages/Codex_AppServer_Module/dist/app-server/codex-app-server-facade.test.js`, `node --test packages/core/dist/model-invocation/model-invocation-profile-resolver.smoke.test.js`, `npm run build --workspace=@codeai-hub/core`; commit: `test: cover codex workflow invocation profiles`)
6. [IN_PROGRESS] Git Commit: `test: cover codex workflow invocation profiles` (hash: TBD)

---

## Phase 5 — Codex App Server Translation Engine (owner: Codex, updated: 2026-04-28)

### Stream: Translation Service

1. [TODO] Add Codex translation instruction/prompt builders equivalent to current `CodexCliTranslationEngine` behavior, including localization marker preservation and Spark summary omission (scope: `packages/Codex_AppServer_Module/src/translation/*`; commit: `feat: add codex translation prompt profile`)
2. [TODO] Git Commit: `feat: add codex translation prompt profile` (hash: TBD)
3. [TODO] Add provider-owned `CodexAppServerTranslationService` with isolated temporary workspace, `approvalPolicy=never`, `sandbox=read-only`, `persistExtendedHistory=false`, `effort=low`, and strict translation process profile (scope: `packages/Codex_AppServer_Module/src/translation/*`, `packages/Codex_AppServer_Module/src/app-server/process/*`; commit: `feat: add codex app-server translation service`)
4. [TODO] Git Commit: `feat: add codex app-server translation service` (hash: TBD)
5. [TODO] Register provider-owned Codex GPT translation engines through Core translation facade composition while keeping the shared `codex exec` engine as fallback during migration (scope: `packages/core/src/translation/*`, `packages/translation/src/*`, `packages/Codex_AppServer_Module/src/index.ts`; commit: `feat: register codex app-server translation engines`)
6. [TODO] Git Commit: `feat: register codex app-server translation engines` (hash: TBD)
7. [TODO] Add tests for translation success, timeout/fallback, engine registration, and no silent fallback when explicit engines are unavailable (scope: `packages/core/src/translation/*.test.ts`, `packages/Codex_AppServer_Module/src/translation/*.test.ts`, `packages/translation/src/*.test.ts`; commit: `test: cover codex app-server translation engines`)
8. [TODO] Git Commit: `test: cover codex app-server translation engines` (hash: TBD)

---

## Phase 6 — Native Request Capture Translation Scenario (owner: Codex, updated: 2026-04-28)

### Stream: Capture Scenario

1. [TODO] Add `Translation` to Provider Native Request Capture scenario types and UI selector without persisting it as a setting (scope: `src/client/ui/src/components/settings/*`, `src/client/project-manager/services/*`; commit: `feat: add translation native capture scenario`)
2. [TODO] Git Commit: `feat: add translation native capture scenario` (hash: TBD)
3. [TODO] Extend Core native capture command metadata/options so scenario `translation` selects `purpose="translation"` instead of building a workflow prompt (scope: `packages/core/src/provider-network-capture/*`, `packages/core/src/remote-bridge/*`; commit: `feat: route native capture through translation profile`)
4. [TODO] Git Commit: `feat: route native capture through translation profile` (hash: TBD)
5. [TODO] Update Codex native capture service so workflow scenarios use workflow profiles and `Translation` uses the Codex translation profile with a fixed small translation sample (scope: `packages/Codex_AppServer_Module/src/diagnostics/*`, `packages/Codex_AppServer_Module/src/translation/*`; commit: `feat: capture codex translation native request`)
6. [TODO] Git Commit: `feat: capture codex translation native request` (hash: TBD)
7. [TODO] Add UI/Core/Codex tests for Translation capture scenario metadata and payload selection (scope: `src/client/ui/src/components/settings/*.test.tsx`, `packages/core/src/provider-network-capture/*.test.ts`, `packages/Codex_AppServer_Module/src/diagnostics/*.test.ts`; commit: `test: cover translation native request capture`)
8. [TODO] Git Commit: `test: cover translation native request capture` (hash: TBD)

---

## Phase 7 — SSOT Docs, Builds, And Release Closeout (owner: Codex, updated: 2026-04-28)

### Stream: Documentation And Verification

1. [TODO] Update final SSOT docs for implemented profile resolver, template sync safety, Codex translation App Server path, and capture Translation scenario (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`; commit: `docs: document invocation profiles and codex translation`)
2. [TODO] Git Commit: `docs: document invocation profiles and codex translation` (hash: TBD)
3. [TODO] Update remaining affected docs and index entries, then move or archive the planning document according to closeout rules if the execution cycle is complete (scope: `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit: `docs: close invocation profile planning docs`)
4. [TODO] Git Commit: `docs: close invocation profile planning docs` (hash: TBD)
5. [TODO] Run targeted builds for Core, Codex module, translation, webview, and Project Manager typecheck/build surfaces; fix any failures in scoped follow-up tasks before release (scope: `packages/core`, `packages/Codex_AppServer_Module`, `packages/translation`, `src/client`; commit: `fix: stabilize invocation profile release checks`)
6. [TODO] Git Commit: `fix: stabilize invocation profile release checks` (hash: TBD)
7. [TODO] Prepare release metadata, run `./scripts/build-all.sh`, run `./scripts/build-release.sh --use-current-version`, move release artifacts as required, and create the session closeout report (scope: release docs/scripts output/session report; commit: `chore: build invocation profile release`)
8. [TODO] Git Commit: `chore: build invocation profile release` (hash: TBD)

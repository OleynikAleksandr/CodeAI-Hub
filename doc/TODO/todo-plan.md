# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "local-models-lmstudio-module-2026-05-28",
  "branch": "main",
  "baseHead": "f4bc0e6a1",
  "lastRecordedCommit": "5b3f5ab7c",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Local_Models_LMStudio_Module_Planning.md",
  "currentTaskId": "local-models.phase4.verify.task1",
  "expectedCommitMessage": "test: verify local models module",
  "debt": {
    "expectedCommitMessage": "test: verify local models module",
    "preCommitHead": "5b3f5ab7c",
    "stage": "commit_pending",
    "taskId": "local-models.phase4.verify.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Local_Models_LMStudio_Module_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the recovery/context source for this execution cycle.

## Execution Rules
- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation microtask must touch no more than 3 files/packages.
- Every implementation microtask is followed by its own `Git Commit: ...` item.
- Do not bypass Husky hooks; use `npm run plan:commit -- "<expected commit message>"`.
- Run targeted tests/builds for touched packages before closing the relevant stream.
- Do not start release notes, version bumps, `build-all.sh`, or `build-release.sh` without separate explicit user confirmation.
- Scope Closeout runs only after explicit user acceptance.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-05-28)
### Stream: Planning Package
1. [DONE] `local-models.phase0.plan.task1` Create the local models planning source, register it in Docs Index, and replace the NONE stub with this active execution todo plan (scope: `doc/SolidWorks-WorkFlow/Plans/Local_Models_LMStudio_Module_Planning.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan local models lm studio module`).
2. [DONE] Git Commit: `docs: plan local models lm studio module` (hash: 31bc5b6f2)

## Phase 1 — Local Models Translation Boundary (owner: Codex, updated: 2026-05-28)
### Stream: Core Local Models Module
3. [DONE] `local-models.phase1.core.task1` Add the Core local-model discovery facade and LM Studio translation engine with model-key engine ids and fail-closed OpenAI-compatible calls (scope: `packages/core/src/local-models/**, packages/core/src/translation/core-translation-facade-factory.ts, packages/core/src/translation/core-localization-facade-factory.ts`; expected commit: `feat: add lm studio local translation engine`).
4. [DONE] Git Commit: `feat: add lm studio local translation engine` (hash: 6e755df66)
5. [DONE] `local-models.phase1.tests.task1` Add focused Core tests for model discovery, engine catalog exposure, and translation request/response handling including `/no_think` for Qwen-family models (scope: `packages/core/src/local-models/**, packages/core/src/translation/core-translation-facade-factory.test.ts, packages/core/src/translation/core-localization-facade-factory.test.ts`; expected commit: `test: cover lm studio local translation engine`).
6. [DONE] Git Commit: `test: cover lm studio local translation engine` (hash: 7c9a126e3)

## Phase 2 — Settings Selection Surface (owner: Codex, updated: 2026-05-28)
### Stream: Local Engine Settings
7. [DONE] `local-models.phase2.settings.task1` Preserve `lmstudio:*` engine ids in Settings state and render local model engine labels in the UI/Reasoning translation engine selectors (scope: `src/client/ui/src/components/settings/use-settings-state-support.ts, src/client/ui/src/components/settings/localization-settings-card.tsx, src/client/ui/src/components/settings/localization-engine-availability.ts`; expected commit: `feat: expose local models in translation settings`).
8. [DONE] Git Commit: `feat: expose local models in translation settings` (hash: 1c3a96765)
9. [DONE] `local-models.phase2.defaults.task1` Normalize persisted settings snapshots so local engine ids round-trip through Core load/save without fallback while keeping old snapshots compatible (scope: `packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts, src/client/ui/src/components/settings/settings-state-model.ts, src/client/ui/src/components/settings/settings-state-helpers.persistence.test.ts`; expected commit: `fix: persist local translation engine selections`).
10. [DONE] Git Commit: `fix: persist local translation engine selections` (hash: e26bdc2c1)

## Phase 3 — Documentation Sync (owner: Codex, updated: 2026-05-28)
### Stream: SSOT Updates
11. [DONE] `local-models.phase3.docs.task1` Update canonical architecture/module docs for the LM Studio local translation boundary, Settings selection semantics, and release-gated limitation that download/delete remains deferred (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md, doc/SolidWorks-WorkFlow/Modules/Localization.md`; expected commit: `docs: document local models translation boundary`).
12. [DONE] Git Commit: `docs: document local models translation boundary` (hash: 5b3f5ab7c)

## Phase 4 — Tooling Verification (owner: Codex, updated: 2026-05-28)
### Stream: Targeted Verification
13. [DONE] `local-models.phase4.verify.task1` Run targeted package builds/tests for Core, translation/localization settings, and Project Manager typecheck; record exact commands/results in this plan (scope: `packages/core, packages/localization, packages/translation, src/client/ui, src/client/project-manager, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `test: verify local models module`).
    - Verification 2026-05-28: `npm run build --workspace @codeai-hub/translation` — PASS.
    - Verification 2026-05-28: `npm run build --workspace @codeai-hub/localization` — PASS.
    - Verification 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS.
    - Verification 2026-05-28: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-28: `npm run build:webview` — PASS.
    - Verification 2026-05-28: `npm run build:project-manager` — PASS.
    - Verification 2026-05-28: `node --test dist/local-models/local-models-facade.test.js` from `packages/core` — PASS (3 tests).
    - Verification 2026-05-28: `node --test dist/translation/core-translation-facade-factory.test.js` from `packages/core` — PASS (9 tests).
    - Verification 2026-05-28: `node --test dist/translation/core-localization-facade-factory.test.js` from `packages/core` — PASS (3 tests).
    - Verification 2026-05-28: `npx tsx --test src/client/ui/src/components/settings/settings-state-helpers.persistence.test.ts` — PASS (2 tests).
14. [PENDING] Git Commit: `test: verify local models module` (hash: TBD)

## Phase 5 — User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-28)
### Stream: Local Runtime Retest
15. [TODO] `local-models.phase5.user-acceptance.task1` User retests three local-model scenarios in Project Manager: Reasoning translation, UI localization bundle materialization, and unavailable LM Studio failure handling (scope: user workflow observation; expected commit: none).

## Phase 6 — Release Build (owner: Codex, updated: 2026-05-28)
### Stream: Release Confirmation And Packaging
16. [TODO] `local-models.phase6.release-confirm.task1` Ask for and receive separate explicit user confirmation for release build after implementation and verification pass (scope: chat/process gate; expected commit: none).
17. [TODO] `local-models.phase6.release-prep.task1` After confirmation only, update README/CHANGELOG for the next release version before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare local models release build`).
18. [TODO] Git Commit: `docs: prepare local models release build` (hash: TBD)
19. [TODO] `local-models.phase6.release-build.task1` Run approved release build scripts, collect generated artifacts, and record exact outputs/results in this plan (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases, doc/TODO/todo-plan.md`; expected commit: `chore: build local models release`).
20. [TODO] Git Commit: `chore: build local models release` (hash: TBD)
21. [TODO] `local-models.phase6.release-package.task1` Run final VSIX packaging from the committed release version and record the VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package local models vsix`).
22. [TODO] Git Commit: `chore: package local models vsix` (hash: TBD)

## Phase 7 — Scope Closeout (owner: Codex, updated: 2026-05-28)
### Stream: Closeout
23. [TODO] `local-models.phase7.closeout.task1` After explicit user acceptance, archive this todo plan, dispose the planning document, update Docs Index, and leave terminal NONE state (scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close local models module scope`).
24. [TODO] Git Commit: `docs: close local models module scope` (hash: TBD)

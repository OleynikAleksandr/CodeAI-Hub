# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "local-models-standalone-chat-selection-2026-06-23",
  "branch": "main",
  "baseHead": "d14e1b4a7",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/LocalModels_StandaloneChat_ModelSelection_Bugfix_Planning.md",
  "currentTaskId": "local-models-selection.phase5.followup.code.task1",
  "expectedCommitMessage": "fix(local-models): seed standalone chat selected model",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/LocalModels_StandaloneChat_ModelSelection_Bugfix_Planning.md`
- **Read this context before implementation:**
  - `AGENTS.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Modules/LocalModels.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
  - `packages/core/src/local-models/local-models-provider-adapter.ts`
  - `src/client/ui/src/session/status-panel.tsx`
- Only this list is the context source for this execution cycle.

## Execution Rules
- **Required reading before every fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Keep each implementation task scoped to no more than 3 files or packages.
- Each implementation task is followed by a separate `Git Commit: ...` line.
- Run `npm run plan:validate` before every `npm run plan:commit -- "<Expected Commit>"`.
- Targeted verification: focused Local Models provider adapter tests, status panel tests, and `npm run plan:validate`.
- **Ponytail Hard Mode:** fix the existing binding/display/runtime selection path; no new chat intake orchestrator in this bugfix.
- **Release Build Confirmation Gate:** do not run `./scripts/build-all.sh` without separate explicit user confirmation.

## Phase 0 - Plan Intake (owner: Codex, updated: 2026-06-23)
### Stream: Adopt Local Models standalone chat selection bugfix
1. [DONE] `local-models-selection.phase0.plan.task1` Create the planning source and active execution plan for Local Models standalone chat model selection/status-panel repair (scope: `doc/SolidWorks-WorkFlow/Plans/LocalModels_StandaloneChat_ModelSelection_Bugfix_Planning.md, doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: start local models standalone chat selection fix`).
2. [DONE] `local-models-selection.phase0.plan.commit1` Git Commit: `docs: start local models standalone chat selection fix` (hash: self)

## Phase 1 - Runtime Selection Fix (owner: Codex, updated: 2026-06-23)
### Stream: Local Models requested model enforcement
3. [DONE] `local-models-selection.phase1.runtime.task1` Make `LocalModelsProviderAdapter` normalize requested LM Studio ids and fail clearly when an explicitly requested model is unavailable instead of silently using the first discovered model (scope: `packages/core/src/local-models/local-models-provider-adapter.ts, packages/core/src/local-models/local-models-provider-adapter.selection.test.ts, doc/SolidWorks-WorkFlow/Modules/LocalModels.md`; expected commit: `fix(local-models): honor requested lm studio model`).
4. [DONE] `local-models-selection.phase1.runtime.commit1` Git Commit: `fix(local-models): honor requested lm studio model` (hash: self)

## Phase 2 - Status Panel Fix (owner: Codex, updated: 2026-06-23)
### Stream: Local Models model identity display
5. [DONE] `local-models-selection.phase2.status.task1` Ensure Session Status Panel renders Local Models model identity and provider tint from `status.models[0]`/binding snapshots (scope: `src/client/ui/src/session/status-panel.tsx, src/client/ui/src/session/status-panel.test.tsx, doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`; expected commit: `fix(ui): show local models status panel identity`).
6. [DONE] `local-models-selection.phase2.status.commit1` Git Commit: `fix(ui): show local models status panel identity` (hash: self)

## Phase 3 - Tooling Verification (owner: Codex, updated: 2026-06-23)
### Stream: Focused checks
7. [DONE] `local-models-selection.phase3.verify.task1` Run focused Local Models/status-panel tests and record evidence (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify local models standalone chat selection fix`).
   - Evidence 2026-06-23: `npx tsx --test packages/core/src/local-models/local-models-provider-adapter.selection.test.ts` passed (2/2); `npx tsx --test src/client/ui/src/session/status-panel.test.tsx` passed (11/11); `npm run plan:validate` passed.
8. [DONE] `local-models-selection.phase3.verify.commit1` Git Commit: `test: verify local models standalone chat selection fix` (hash: self)

## Phase 4 - Release Build (owner: Codex, updated: 2026-06-23)
### Stream: Release scope and packaging
9. [DONE] `local-models-selection.phase4.release.scope.task1` Add release build tasks after explicit user confirmation to build a new release for the Local Models standalone chat selection fix (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add release build scope for local models fix`).
10. [DONE] `local-models-selection.phase4.release.scope.commit1` Git Commit: `docs: add release build scope for local models fix` (hash: self)
11. [DONE] `local-models-selection.phase4.release.docs.task1` Update release notes for v1.2.593 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare v1.2.593 local models release notes`).
   - Evidence 2026-06-23: README current release and CHANGELOG entry prepared for v1.2.593 before running release scripts.
12. [DONE] `local-models-selection.phase4.release.docs.commit1` Git Commit: `docs: prepare v1.2.593 local models release notes` (hash: self)
13. [DONE] `local-models-selection.phase4.release.build.task1` Run the release build scripts and record produced artifacts/evidence (scope: `assets/**/manifest.json, package*.json, packages/*/package.json, doc/TODO/todo-plan.md`; expected commit: `build: release v1.2.593`).
   - Evidence 2026-06-23: `./scripts/build-all.sh` passed and produced provider/core/launcher/UI tarballs for v1.2.593 in `doc/tmp/releases/`.
   - Evidence 2026-06-23: `./scripts/build-release.sh --use-current-version --allow-dirty` passed after the version-manifest bump, including `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, and VSIX runtime package surface verification.
   - Artifact: `codeai-hub-1.2.593.vsix` (5.5M) created at repository root.
14. [DONE] `local-models-selection.phase4.release.build.commit1` Git Commit: `build: release v1.2.593` (hash: self)

## Phase 5 - Retest Follow-up Fix (owner: Codex, updated: 2026-06-23)
### Stream: Local Models standalone chat binding
15. [DONE] `local-models-selection.phase5.followup.plan.task1` Add follow-up tasks after user retest showed standalone Local Models chat still seeds the sentinel `local-model` instead of a selected LM Studio model (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add local models standalone chat binding follow-up`).
16. [DONE] `local-models-selection.phase5.followup.plan.commit1` Git Commit: `docs: add local models standalone chat binding follow-up` (hash: self)
17. [IN_PROGRESS] `local-models-selection.phase5.followup.code.task1` Pass the resolved Local Models selected model into standalone chat session creation instead of relying on the persisted sentinel fallback (scope: `src/client/project-manager/components/layout/workspace-chat-list.tsx, src/client/project-manager/api.ts, src/client/project-manager/components/layout/workspace-chat-list-open.test.ts`; expected commit: `fix(local-models): seed standalone chat selected model`).
18. [TODO] `local-models-selection.phase5.followup.code.commit1` Git Commit: `fix(local-models): seed standalone chat selected model` (hash: TBD)
19. [TODO] `local-models-selection.phase5.followup.docs.task1` Document the standalone Local Models chat binding rule (scope: `doc/SolidWorks-WorkFlow/Modules/LocalModels.md, doc/TODO/todo-plan.md`; expected commit: `docs: document local models standalone chat binding`).
20. [TODO] `local-models-selection.phase5.followup.docs.commit1` Git Commit: `docs: document local models standalone chat binding` (hash: TBD)
21. [TODO] `local-models-selection.phase5.followup.verify.task1` Run focused standalone chat binding checks and record evidence (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify local models standalone binding fix`).
22. [TODO] `local-models-selection.phase5.followup.verify.commit1` Git Commit: `test: verify local models standalone binding fix` (hash: TBD)

## Phase 6 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-23)
### Stream: User retest
23. [TODO] `local-models-selection.phase6.acceptance.task1` User verifies standalone Local Models chat shows the selected model in the lower status panel and runs that model on the next turn (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record local models selection user acceptance`).
24. [TODO] `local-models-selection.phase6.acceptance.commit1` Git Commit: `chore: record local models selection user acceptance` (hash: TBD)

## Phase 7 - Scope Closeout (owner: Codex, updated: 2026-06-23)
### Stream: Archive + planning-doc disposition
25. [TODO] `local-models-selection.phase7.closeout.task1` After explicit user acceptance, archive this plan and decide planning-doc disposition (scope: `doc/TODO/Archive/**, doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close local models standalone chat selection scope`).
26. [TODO] `local-models-selection.phase7.closeout.commit1` Git Commit: `docs: close local models standalone chat selection scope` (hash: TBD)

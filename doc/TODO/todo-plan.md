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
  "currentTaskId": "local-models-selection.phase4.acceptance.task1",
  "expectedCommitMessage": "chore: record local models selection user acceptance",
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

## Phase 4 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-23)
### Stream: User retest
9. [IN_PROGRESS] `local-models-selection.phase4.acceptance.task1` User verifies standalone Local Models chat shows the selected model in the lower status panel and runs that model on the next turn (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record local models selection user acceptance`).
10. [TODO] `local-models-selection.phase4.acceptance.commit1` Git Commit: `chore: record local models selection user acceptance` (hash: TBD)

## Phase 5 - Scope Closeout (owner: Codex, updated: 2026-06-23)
### Stream: Archive + planning-doc disposition
11. [TODO] `local-models-selection.phase5.closeout.task1` After explicit user acceptance, archive this plan and decide planning-doc disposition (scope: `doc/TODO/Archive/**, doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close local models standalone chat selection scope`).
12. [TODO] `local-models-selection.phase5.closeout.commit1` Git Commit: `docs: close local models standalone chat selection scope` (hash: TBD)

# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "gemini-removal-2026-06-24",
  "branch": "main",
  "baseHead": "6d7826ade",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Gemini_Removal_Planning_RU.md",
  "currentTaskId": "gemini-removal.phase1.settings-handlers.task1",
  "expectedCommitMessage": "refactor: drop Gemini settings handlers",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Gemini_Removal_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Only this list is the document source for restoring this execution cycle's context.

## Execution Rules

- **Required reading before every fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **Goal:** fully remove the Gemini provider (code, SDK, package, UI, settings, build, docs); then re-run `npm audit` and build a Gemini-free release.
- **Removal order:** UI consumers -> extension-module settings -> core registration/config/remote-bridge/usage-limits -> narrow shared union types last -> delete `Gemini_Module` + SDK + build scripts -> documentation. Remove a Gemini file together with its usages so `knip` does not flag orphaned exports.
- Keep each implementation task scoped to no more than 3 files or packages.
- Each implementation task is followed by a separate `Git Commit: ...` line.
- The plan grows incrementally: add the next task before committing the current one; never leave a committed task without a following task.
- Run `npm run plan:validate` before every `npm run plan:commit -- "<Expected Commit>"`.
- Targeted verification uses the smallest affected tests/builds first.
- **Release Build Confirmation Gate:** do not run `./scripts/build-all.sh` or `./scripts/build-release.sh` without separate explicit user confirmation.
- Scope Closeout runs only after explicit user acceptance.

## Phase 0 - Planning Intake (owner: CodeAI Hub Bot, updated: 2026-06-24)

### Stream: Accepted scope

1. [DONE] `gemini-removal.phase0.plan.task1` Create the Gemini removal planning source and active todo-plan for the accepted full-removal scope (scope: `doc/SolidWorks-WorkFlow/Plans/Gemini_Removal_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan Gemini removal`).
2. [DONE] `gemini-removal.phase0.plan.commit1` Git Commit: `docs: plan Gemini removal` (hash: self)

## Phase 1 - UI Provider Surface (owner: CodeAI Hub Bot, updated: 2026-06-24)

### Stream: Capture workbench

3. [DONE] `gemini-removal.phase1.capture-selector.task1` Remove the disabled Gemini option and tooltip from the capture workbench provider selector and update its selection-bar test (scope: `src/client/project-manager/components/capture-workbench/provider-selector.tsx, src/client/project-manager/components/capture-workbench/selection-bar.test.tsx`; expected commit: `refactor: drop Gemini from capture workbench selector`).
4. [DONE] `gemini-removal.phase1.capture-selector.commit1` Git Commit: `refactor: drop Gemini from capture workbench selector` (hash: self)

### Stream: Workspace tree provider surfaces

5. [DONE] `gemini-removal.phase1.workspace-tree.task1` Remove the `geminiCli` branch from the workspace tree branch-node title resolvers (runtime string checks; `use-step-provider-resolver.ts` deferred to the union-type phase because of the `Record<ProviderStackId,...>` exhaustiveness) (scope: `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`; expected commit: `refactor: drop Gemini from workspace tree resolvers`).
6. [DONE] `gemini-removal.phase1.workspace-tree.commit1` Git Commit: `refactor: drop Gemini from workspace tree resolvers` (hash: self)

### Stream: Start card model selection

7. [DONE] `gemini-removal.phase1.start-card.task1` Remove the `geminiCli` provider case and Gemini default/fallback model branches from the workflow start-card model selection (scope: `src/client/project-manager/components/shared/stage-start-model-selection.ts`; expected commit: `refactor: drop Gemini from start card model selection`).
8. [DONE] `gemini-removal.phase1.start-card.commit1` Git Commit: `refactor: drop Gemini from start card model selection` (hash: self)

### Stream: Stage confirmation card

9. [DONE] `gemini-removal.phase1.stage-card.task1` Remove the `geminiCli` branch from the stage-confirmation-card provider-stack guards (`stage-confirmation-card-provider-tint.ts` deferred to the union-type phase because of the `Record<ProviderStackId,...>` exhaustiveness) (scope: `src/client/project-manager/components/shared/stage-confirmation-card-workflow.ts, src/client/project-manager/components/shared/stage-confirmation-card.tsx`; expected commit: `refactor: drop Gemini from stage confirmation card`).
10. [DONE] `gemini-removal.phase1.stage-card.commit1` Git Commit: `refactor: drop Gemini from stage confirmation card` (hash: self)

### Stream: Session theme and model helpers

11. [DONE] `gemini-removal.phase1.session-theme.task1` Remove Gemini from the session provider theme, model-info builder and session candidates, plus the dialog-panel theme test it feeds (scope: `src/client/ui/src/session/helpers.ts, src/client/ui/src/session/model-info-builder.ts, src/client/ui/src/session/session-candidates.ts, src/client/ui/src/session/dialog-panel-message-utils.test.ts`; expected commit: `refactor: drop Gemini from session theme helpers`).
12. [DONE] `gemini-removal.phase1.session-theme.commit1` Git Commit: `refactor: drop Gemini from session theme helpers` (hash: self)

### Stream: Session status panel

13. [DONE] `gemini-removal.phase1.session-status.task1` Remove the Gemini label-prefix and fallback-label branches from the session id bar (`status-panel.tsx` `Record<ProviderStackId,...>` button-class map and its `--gemini` CSS class deferred to the union-type/CSS phase) (scope: `src/client/ui/src/session/session-id-bar.tsx`; expected commit: `refactor: drop Gemini from session status panel`).
14. [DONE] `gemini-removal.phase1.session-status.commit1` Git Commit: `refactor: drop Gemini from session status panel` (hash: self)

### Stream: Project-manager provider services

15. [DONE] `gemini-removal.phase1.pm-services.task1` Remove Gemini from the project-manager provider snapshot list and usage-limits stream prefix (`workflow-provider-resolver.ts` guard + its `geminiCli`-protagonist test deferred to the union-type phase) (scope: `src/client/project-manager/services/provider-snapshot.ts, src/client/project-manager/components/sessions/usage-limits-stream.ts`; expected commit: `refactor: drop Gemini from PM provider services`).
16. [DONE] `gemini-removal.phase1.pm-services.commit1` Git Commit: `refactor: drop Gemini from PM provider services` (hash: self)

### Stream: Settings provider tab

17. [DONE] `gemini-removal.phase1.settings-tab.task1` Remove the Gemini settings tab from the settings provider tab content and delete the now-orphaned gemini-default-model card directory; settings-state types/helpers and gemini-mapping follow once no reader remains (scope: `src/client/ui/src/components/settings/settings-provider-tab-content.tsx, src/client/ui/src/components/settings/gemini-default-model/**`; expected commit: `refactor: drop Gemini settings provider tab`).
18. [DONE] `gemini-removal.phase1.settings-tab.commit1` Git Commit: `refactor: drop Gemini settings provider tab` (hash: self)

### Stream: Settings handlers

19. [IN_PROGRESS] `gemini-removal.phase1.settings-handlers.task1` Remove the Gemini update helpers and the handlers that wire them from the webview settings state hook (scope: `src/client/ui/src/components/settings/settings-state-helpers.ts, src/client/ui/src/components/settings/use-settings-state.ts, src/client/ui/src/components/settings/use-settings-state-support.ts`; expected commit: `refactor: drop Gemini settings handlers`).
20. [TODO] `gemini-removal.phase1.settings-handlers.commit1` Git Commit: `refactor: drop Gemini settings handlers` (hash: TBD)

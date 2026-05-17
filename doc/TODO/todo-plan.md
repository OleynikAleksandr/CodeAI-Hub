# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "pm-sidebar-settings-action-2026-05-17",
  "branch": "main",
  "baseHead": "3ad97771b",
  "lastRecordedCommit": "3ad97771b",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/PM_Sidebar_Settings_Action_Planning.md",
  "currentTaskId": "pm-sidebar-settings.phase0.plan.task1",
  "expectedCommitMessage": "docs: plan pm sidebar settings action",
  "debt": {
    "expectedCommitMessage": "docs: plan pm sidebar settings action",
    "preCommitHead": "3ad97771b",
    "stage": "commit_pending",
    "taskId": "pm-sidebar-settings.phase0.plan.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/PM_Sidebar_Settings_Action_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/PM_Sidebar_Settings_Action_Planning.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- Scope: remove the Project Manager bottom footer/status bar and move `Open Settings` to the bottom of the left sidebar.
- Do not change Settings ownership: the button remains only a PM command surface that opens the existing right-panel Settings takeover.
- Keep the session and artifact panels vertically expanded by removing the footer render path.
- Keep microtasks to no more than 3 files each.
- Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks. Do not bypass hooks.
- Release build requires separate explicit user confirmation.

## Phase 0 - Planning Intake (owner: Codex, updated: 2026-05-17)

### Stream: Active Scope Creation

1. [DONE] `pm-sidebar-settings.phase0.plan.task1` Create planning source, register it in Docs_Index, and open the active todo-plan (scope: `doc/SolidWorks-WorkFlow/Plans/PM_Sidebar_Settings_Action_Planning.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan pm sidebar settings action`).
2. [PENDING] Git Commit: `docs: plan pm sidebar settings action` (hash: TBD)

## Phase 1 - Project Manager Layout Update (owner: Codex, updated: 2026-05-17)

### Stream: Sidebar Settings Action

3. [TODO] `pm-sidebar-settings.phase1.layout.task1` Move `Open Settings` into the bottom of the left sidebar and remove the footer render path from the main area (scope: `src/client/project-manager/components/layout/sidebar.tsx, src/client/project-manager/components/layout/main-area.tsx, packages/ui/project-manager/styles.css`; expected commit: `feat: move pm settings action to sidebar`).
4. [TODO] Git Commit: `feat: move pm settings action to sidebar` (hash: TBD)
5. [TODO] `pm-sidebar-settings.phase1.cleanup.task1` Remove the obsolete footer component after the main layout no longer imports it (scope: `src/client/project-manager/components/layout/status-bar.tsx`; expected commit: `refactor: remove pm status bar component`).
6. [TODO] Git Commit: `refactor: remove pm status bar component` (hash: TBD)

## Phase 2 - Documentation And Verification (owner: Codex, updated: 2026-05-17)

### Stream: SSOT Documentation

7. [TODO] `pm-sidebar-settings.phase2.docs.task1` Update PM/UI bundle SSOT docs for sidebar-owned Settings action and removed bottom footer (scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md, doc/TODO/todo-plan.md`; expected commit: `docs: document pm sidebar settings action`).
8. [TODO] Git Commit: `docs: document pm sidebar settings action` (hash: TBD)

### Stream: Tooling Verification

9. [TODO] `pm-sidebar-settings.phase2.verify.task1` Run targeted PM layout verification and webview build/typecheck, then record results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify pm sidebar settings action`).
10. [TODO] Git Commit: `test: verify pm sidebar settings action` (hash: TBD)

## Phase 3 - User Visual Acceptance Testing (owner: Oleksandr, updated: 2026-05-17)

### Stream: User Retest

11. [TODO] `pm-sidebar-settings.phase3.acceptance.task1` User tests Project Manager and confirms the bottom footer is gone, `Workflow Tree MVP` is not visible, `Open Settings` sits at the bottom of the left sidebar, and session/artifact panes have the reclaimed vertical space (scope: user visual acceptance only; expected commit: none).

## Phase 4 - Scope Closeout (owner: Codex, updated: 2026-05-17)

### Stream: Scope Closeout

12. [TODO] `pm-sidebar-settings.phase4.closeout.task1` After explicit user acceptance, archive the active todo-plan, resolve the planning document disposition, and update Docs_Index if needed (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close pm sidebar settings action scope`).
13. [TODO] Git Commit: `docs: close pm sidebar settings action scope` (hash: TBD)
14. [TODO] `pm-sidebar-settings.phase4.closeout.handoff` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.

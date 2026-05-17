# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-review-confirm-button-2026-05-17",
  "branch": "main",
  "baseHead": "e7b5f78e0",
  "lastRecordedCommit": "8cab9d7cc",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/ManagedReview_ConfirmButton_Planning.md",
  "currentTaskId": "managed-review-confirm.phase1.core.task1",
  "expectedCommitMessage": "fix: update managed review handoff copy",
  "debt": {
    "expectedCommitMessage": "fix: update managed review handoff copy",
    "preCommitHead": "8cab9d7cc",
    "stage": "commit_pending",
    "taskId": "managed-review-confirm.phase1.core.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ManagedReview_ConfirmButton_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/ManagedReview_ConfirmButton_Planning.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- Scope: replace managed user-review prose acceptance with a visible `Подтверждаю` action button on the Core/system review card.
- Core remains workflow authority: the UI button submits user intent only; Core classifies acceptance and advances managed stage plans.
- Do not add Project Manager-owned acceptance state or direct plan mutation.
- Keep microtasks to no more than 3 files each.
- Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks. Do not bypass hooks.
- Release build requires separate explicit user confirmation.

## Phase 0 - Planning Intake (owner: Codex, updated: 2026-05-17)

### Stream: Active Scope Creation

1. [DONE] `managed-review-confirm.phase0.plan.task1` Create planning source, register it in Docs_Index, and open the active todo-plan (scope: `doc/SolidWorks-WorkFlow/Plans/ManagedReview_ConfirmButton_Planning.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan managed review confirmation button`).
2. [DONE] Git Commit: `docs: plan managed review confirmation button` (hash: 8cab9d7cc)

## Phase 1 - Managed Review Confirmation UX (owner: Codex, updated: 2026-05-17)

### Stream: Core Handoff Copy

3. [DONE] `managed-review-confirm.phase1.core.task1` Replace managed user-review handoff copy so it points to the inline button instead of instructing users to type `подтверждаю`, and update Core handoff tests (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-user-handoff-messages.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts`; expected commit: `fix: update managed review handoff copy`).
4. [PENDING] Git Commit: `fix: update managed review handoff copy` (hash: TBD)

### Stream: Session UI Button

5. [TODO] `managed-review-confirm.phase1.ui.task1` Render an inline `Подтверждаю` action on `managed-workflow-user-review` system cards and route it through the existing send path (scope: `src/client/ui/src/session/dialog-panel.tsx, src/client/ui/src/session/session-view.tsx, media/session-view.css`; expected commit: `feat: add managed review confirm button`).
6. [TODO] Git Commit: `feat: add managed review confirm button` (hash: TBD)

### Stream: UI Regression Coverage

7. [TODO] `managed-review-confirm.phase1.test.task1` Add render coverage for the managed review confirm button on the system dialog card (scope: `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts`; expected commit: `test: cover managed review confirm button`).
8. [TODO] Git Commit: `test: cover managed review confirm button` (hash: TBD)

## Phase 2 - Documentation And Verification (owner: Codex, updated: 2026-05-17)

### Stream: SSOT Documentation

9. [TODO] `managed-review-confirm.phase2.docs.task1` Document that managed review acceptance may be submitted from the inline system-card button while Core remains acceptance authority (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`; expected commit: `docs: document managed review confirm button`).
10. [TODO] Git Commit: `docs: document managed review confirm button` (hash: TBD)

### Stream: Tooling Verification

11. [TODO] `managed-review-confirm.phase2.verify.task1` Run targeted Core/UI tests plus webview typecheck and record results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify managed review confirm button`).
12. [TODO] Git Commit: `test: verify managed review confirm button` (hash: TBD)

## Phase 3 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-17)

### Stream: User Retest

13. [TODO] `managed-review-confirm.phase3.acceptance.task1` User retests a managed user-review card and confirms the inline `Подтверждаю` button submits acceptance and advances the Core-owned stage lifecycle (scope: user workflow acceptance only; expected commit: none).

## Phase 4 - Scope Closeout (owner: Codex, updated: 2026-05-17)

### Stream: Scope Closeout

14. [TODO] `managed-review-confirm.phase4.closeout.task1` After explicit user acceptance, archive the active todo-plan, resolve the planning document disposition, and update Docs_Index if needed (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed review confirm button scope`).
15. [TODO] Git Commit: `docs: close managed review confirm button scope` (hash: TBD)

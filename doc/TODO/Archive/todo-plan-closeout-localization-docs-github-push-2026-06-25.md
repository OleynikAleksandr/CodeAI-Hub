# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "localization-docs-github-push-2026-06-25",
  "branch": "main",
  "baseHead": "478b726c0",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Localization_Documentation_GitHub_Push_Planning_RU.md",
  "currentTaskId": "loc-docs-push.phase3.stream1.task1",
  "expectedCommitMessage": "docs: close localization documentation push scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Localization_Documentation_GitHub_Push_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionDialogPanel.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Use `npm run plan:commit -- "<expected commit message>"` for tracked commits.
- Keep each task scoped to no more than 3 tracked files.
- No release rebuild is required; user already accepted `1.2.612`.

## Phase 1 - Planning Intake (owner: Codex, updated: 2026-06-25)

### Stream: Planning

1. [DONE] `loc-docs-push.phase1.stream1.task1` Create the planning source and active execution plan for Localization documentation and GitHub push (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Localization_Documentation_GitHub_Push_Planning_RU.md`; expected commit: `docs: plan localization documentation push`).
2. [DONE] Git Commit: `docs: plan localization documentation push` (hash: self)

## Phase 2 - Documentation Actualization (owner: Codex, updated: 2026-06-25)

### Stream: Localization And Translation SSOT

3. [DONE] `loc-docs-push.phase2.stream1.task1` Clarify Localization/runtime translation ownership after release 1.2.612 (scope: `doc/SolidWorks-WorkFlow/Modules/Localization.md, doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md, doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`; expected commit: `docs: clarify localization reasoning translation contract`).
4. [DONE] Git Commit: `docs: clarify localization reasoning translation contract` (hash: self)

### Stream: Session UI Projection Docs

5. [DONE] `loc-docs-push.phase2.stream2.task1` Document the Session Dialog translation-first projection and history replay path (scope: `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md, doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionDialogPanel.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: document session dialog reasoning translation projection`).
6. [DONE] Git Commit: `docs: document session dialog reasoning translation projection` (hash: self)

## Phase 3 - Scope Closeout (owner: Codex, updated: 2026-06-25)

### Stream: Closeout

7. [IN_PROGRESS] `loc-docs-push.phase3.stream1.task1` Close this documentation/push scope after documentation commits (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close localization documentation push scope`).
8. [TODO] Git Commit: `docs: close localization documentation push scope` (hash: TBD)
9. [TODO] `loc-docs-push.phase3.stream1.handoff` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.

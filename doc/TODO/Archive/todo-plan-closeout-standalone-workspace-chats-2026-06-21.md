# Plan Closeout: standalone-workspace-chats-2026-06-21

**Created:** 2026-06-21T14:54:26.766Z
**Acceptance:** User accepted the Workflow/Chat sidebar switch and standalone workspace chat behavior on 2026-06-21.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** phase1.stream7.task1
**Expected Commit:** docs: close standalone workspace chats scope
**Last Recorded Commit:** self
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Standalone_Workspace_Chats_Planning.md

## Active Plan Copy

````markdown
# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "standalone-workspace-chats-2026-06-21",
  "branch": "main",
  "baseHead": "9a39a9ed0",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Standalone_Workspace_Chats_Planning.md",
  "currentTaskId": "phase1.stream7.task1",
  "expectedCommitMessage": "docs: close standalone workspace chats scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Standalone_Workspace_Chats_Planning.md`
- **Read this context before implementation:**
  - `AGENTS.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules
- **Required reading before every fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Keep each task scoped to no more than 3 files or packages.
- Each implementation task is followed by a separate `Git Commit: ...` line.
- Run `npm run plan:validate` before every `npm run plan:commit -- "<Expected Commit>"`.
- Do not run release build or VSIX packaging without explicit user confirmation.

## Phase 1 - Standalone Workspace Chats (owner: Codex, updated: 2026-06-21)
### Stream: Planning Intake
1. [DONE] `phase1.stream1.task1` Create the accepted planning source and active execution plan for standalone workspace chats (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Standalone_Workspace_Chats_Planning.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan standalone workspace chats`).
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan standalone workspace chats` (hash: self)

### Stream: Core Chat Storage And Listing
3. [DONE] `phase1.stream2.task1` Store stage-less workspace chat histories under the selected workspace and expose a minimal list endpoint for saved chats (scope: `packages/core/src/unified-session/storage.ts, packages/core/src/unified-session/standalone-workspace-chat-list.ts, packages/core/src/remote-bridge/handlers/http-api-session-routes.ts`; expected commit: `feat: add workspace standalone chat storage`).
4. [DONE] `phase1.stream2.commit1` Git Commit: `feat: add workspace standalone chat storage` (hash: self)

### Stream: Detached Session Window
5. [DONE] `phase1.stream3.task1` Add a detached standalone-session app mode that renders one existing Session UI by `sessionId` (scope: `src/client/project-manager/app.tsx, src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx, src/client/project-manager/api.ts`; expected commit: `feat: open standalone chat windows`).
6. [DONE] `phase1.stream3.commit1` Git Commit: `feat: open standalone chat windows` (hash: self)

### Stream: Sidebar Chat Mode
7. [DONE] `phase1.stream4.task1` Add the sidebar Workflow/Chat switch, chat list, and New Chat provider-picker launch path (scope: `src/client/project-manager/components/layout/sidebar.tsx, src/client/project-manager/components/layout/workspace-chat-list.tsx, packages/ui/project-manager/styles.css`; expected commit: `feat: add sidebar chat mode`).
8. [DONE] `phase1.stream4.commit1` Git Commit: `feat: add sidebar chat mode` (hash: self)

### Stream: Tooling Verification
9. [DONE] `phase1.stream5.task1` Run targeted Core/Project Manager checks and record evidence (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify standalone workspace chats`).
    - Evidence 2026-06-21: `npm run build --workspace @codeai-hub/core` PASS.
    - Evidence 2026-06-21: `npm run build:project-manager` PASS.
    - Evidence 2026-06-21: `npm run typecheck:webview` PASS.
    - Evidence 2026-06-21: `npm exec -- ultracite check` PASS.
10. [DONE] `phase1.stream5.commit1` Git Commit: `test: verify standalone workspace chats` (hash: self)

### Stream: User Workflow Acceptance Testing
11. [DONE] `phase1.stream6.task1` User verifies Workflow mode, Chat mode, New Chat, and existing chat reopen behavior (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record standalone chat acceptance`).
    - Evidence 2026-06-21: user confirmed the implementation is correct and accepted the Workflow/Chat sidebar switch plus standalone chat behavior.
12. [DONE] `phase1.stream6.commit1` Git Commit: `docs: record standalone chat acceptance` (hash: self)

### Stream: Scope Closeout
13. [IN_PROGRESS] `phase1.stream7.task1` Close accepted scope and archive planning artifacts after the User Acceptance Gate (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close standalone workspace chats scope`).
14. [TODO] `phase1.stream7.commit1` Git Commit: `docs: close standalone workspace chats scope` (hash: TBD)
15. [TODO] `phase1.stream7.handoff` Reserved post-closeout handoff anchor.
````

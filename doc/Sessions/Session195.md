# Session 195 — Workspace Switch Auto-Select Stale Snapshot Fix

**Date:** 2026-03-30 08:30–09:30 (CEST)
**Branch:** main
**Version:** 1.1.843

---

# 1. Work Done in This Session

## Work summary
- Diagnosed and fixed the root cause of "Start with Description questionnaire" placeholder appearing when switching between workspaces with active sessions
- Phase 112 (v1.1.842): removed unconditional `setHasDescriptionSession(false)` from reset effect, added `workflowStoreLoaded` guard — partial fix, placeholder still appeared
- Phase 114 (v1.1.843): found the real root cause in `workspace-tree.tsx` auto-select forwarding effect — stale previous-workspace snapshot consumed `pendingWorkspaceIdRef` before correct data arrived, permanently preventing `pm:dialog:open` dispatch for the new workspace
- Fix: added `storeState.workspaceSlug === workspaceSlug` guard so auto-select only fires when the store holds data for the current workspace
- Release: v1.1.843 (VSIX 1.8 MB)
- Updated Phase 111 in todo-plan to DONE (was TODO with existing commits)

## Key fix (Phase 114)
Effect ordering race: when `selectedWorkspaceId` changed, `handleStateUpdate` callback was recreated (new reference), triggering the forwarding effect. But `storeState` still held old workspace data (`loaded: true`) because `WorkflowStateStore.activate()` hadn't emitted yet. This called `handleStateUpdate(oldSnapshot)` which dispatched `pm:dialog:open` with wrong `providerSessionId` + new `workspacePath`, then set `pendingWorkspaceIdRef.current = null`. When the correct snapshot arrived, auto-select early-returned because `pendingWorkspaceIdRef.current !== selectedWorkspaceId`.

## Git commits
- `da1a8d97 fix: prevent false questionnaire placeholder on workspace switch`
- `d236ba4d docs(release): prepare workspace switch visibility hotfix`
- `5918cae4 chore: prepare v1.1.842 artifacts`
- `f2ca39c8 fix: guard auto-select against stale workspace snapshot`
- `a91f68c2 docs(release): prepare workspace switch visibility hotfix`
- `74659ca8 chore: prepare v1.1.843 artifacts`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session195.md` (THIS REPORT)

> Далее: в зависимости от задачи открыть нужные документы из `doc/SolidWorks-WorkFlow/Clusters/`, `doc/SolidWorks-WorkFlow/Modules/`, `doc/SolidWorks-WorkFlow/Contracts/`.

## Plans for next session
- Тестирование v1.1.843: workspace switch end-to-end (3 workspaces, 3 провайдера, переключение между ними)
- Deferred (Phase 104 item 23): перенос optimistic guard в shared WorkflowStateStore
- Deferred: Gemini delay after submit — `queueMicrotask()` в session ID emission + polling intervals
- Архивация завершённого todo-plan.md при необходимости

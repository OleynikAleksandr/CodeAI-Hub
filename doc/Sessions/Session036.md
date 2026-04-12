# Session 036 — Localization Fix, Session Restore, Artifact Panel Jitter

**Date:** 2026-04-12 09:00 (CEST)
**Branch:** main
**Version:** 1.1.953
**Execution Scope Status:** ACTIVE

---

# 1. Work Done in This Session

## Work summary

### Fix: Confirmation card localization
- Added all missing message IDs to approved source dictionaries (`ui_labels.json`, `ui_helper_text.json`, `messages_for_the_user.json`)
- Initial attempt placed keys in legacy files (`ui_interface.json`, `user_guidance.json`, `system_feedback.json`) which are shadowed by the approved files — moved keys to correct files
- Fixed `confirm_warning` to use `{upstreamStage}` template variable instead of JS template literal
- Added §4.5 Source Dictionary File Map to `UserFacing_Text_Localization_Boundary.md` contract — explicit mapping from runtime categories to approved source dictionary files
- Added approved dictionary file map to invariant 16 in `SystemArchitecture.md`
- Saved feedback memory about approved vs legacy dictionaries

### Fix: Empty session on workspace open
- Root cause found via diagnostic logs: retry `dialog:list:result` responses from the dialog list polling interval re-ran `createDialogBootstrapSnapshots`, overwriting 16 already-loaded messages with empty bootstrap snapshot
- Fix: guard in `dialog:list:result` handler — skip re-bootstrap if `dialogIdRef` and `sessionRef` already point to this dialog
- Additional defensive fixes: auto-select retry when first snapshot has no session chains; WorkflowStateStore emits on chains count change

### Fix: Right panel (Help/Artifacts) jitter during agent responses
- `MainAreaArtifactContent` JSX memoized via `useMemo` in `main-area.tsx` with correct dependencies
- `MainAreaArtifactContent` component wrapped with `React.memo`
- Inline arrow callbacks extracted to stable `useCallback` refs

### Memory cleanup
- Deleted 3 stale/redundant memory files (`architecture.md`, `workflow-templates.md`, `feedback-release-docs-first.md`)
- Merged release docs feedback into single file
- Rewrote MEMORY.md index (9 files, was 13)

## Git commits
(ВАЖНО: при `Execution Scope Status: ACTIVE` следующая сессия обязана просмотреть каждый коммит через `git show --stat <hash>` и `git show <hash>`.)
- `9a21948d6 fix: add confirmation card localization keys to source dictionaries`
- `07f27e16e fix: move confirmation card keys to approved source dictionaries`
- `57ab76b9a docs: add source dictionary file map to localization boundary contract`
- `23975c67c docs: add approved dictionary file map to invariant 16 in SystemArchitecture`
- `43b44b05d fix: retry session dispatch on workspace auto-select when chains are empty`
- `0998d319a fix: prevent retry dialog:list:result from overwriting loaded messages`
- `627bd5444 fix: memoize artifact panel and remove diagnostic logs`
- Version bumps: `0a2491ace`, `8aa0d79f5`, `cf3ab36fa`, `0de32ce91`, `f88e7204b`, `ef9f98e23`
- Diagnostic (temporary, removed in 627bd5444): `f510799f4`, `6e44f914a`, `a7aa2582d`, `b13dc4a30`, `42f6339f1`

---

# 2. Instructions for Next Session

**Recovery Owner:** `doc/TODO/todo-plan.md`

## Plans for next session
- Продолжать активный execution scope по `doc/TODO/todo-plan.md`.
- Список документов для восстановления контекста находится только в активном `doc/TODO/todo-plan.md`.
- Тестировать v1.1.953: подёргивание правой панели Help при стриме агента, session restore при открытии workspace.

## Key files modified this session
- `assets/localization/source/en/ui_labels.json` — confirmation card label keys
- `assets/localization/source/en/ui_helper_text.json` — confirmation card helper text keys
- `assets/localization/source/en/messages_for_the_user.json` — confirmation card feedback key
- `src/client/project-manager/components/shared/stage-confirmation-card.tsx` — `{upstreamStage}` variable fix
- `src/client/project-manager/components/layout/main-area.tsx` — `useMemo` on artifact content, `useCallback` for callbacks
- `src/client/project-manager/components/layout/main-area-panel-content.tsx` — `React.memo` on `MainAreaArtifactContent`
- `src/client/project-manager/components/layout/workspace-tree-auto-select.ts` — retry logic with `stageDispatchedRef`
- `src/client/project-manager/services/workflow-state-store.ts` — emit on chains count change
- `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts` — skip re-bootstrap guard
- `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md` — §4.5 + review checklist items
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — invariant 16 update

## Architecture decisions made
1. Localization keys must go to approved source dictionaries only; legacy files are shadowed
2. Dialog list retry must not re-bootstrap an already-matched dialog
3. Artifact panel content memoized to prevent re-render from session stream events

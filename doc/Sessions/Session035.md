# Session 035 — Stage Confirmation Card and Session View Architecture

**Date:** 2026-04-11 19:00 (CEST)
**Branch:** main
**Version:** 1.1.942
**Execution Scope Status:** ACTIVE

---

# 1. Work Done in This Session

## Work summary

### Feature: Stage Confirmation Card
- Created `src/client/project-manager/components/shared/stage-confirmation-card.tsx` — universal confirmation card that replaces the removed toolbar's step launch functionality
- When user clicks an idle trunk stage (Virtual Simulation, Diagram Modules) in sidebar without an existing session, left panel shows confirmation card with upstream artifact info, availability status, warning text, and Start step button
- Confirmation card is universal — takes stage name and upstream artifact from context, works for any trunk stage
- Localization uses correct categories: `ui_interface` for labels, `user_guidance` for helper text, `system_feedback` for runtime messages
- CSS fade-out transition (300ms) on card when session is created
- Button spinner CSS added for starting state (`pm-confirmation-card__start-btn--starting`)
- Prototype updated in `doc/tmp/prototypes/development-tree-sidebar.html` with full interactive demo

### Architecture fix: Prop-based session intent (replaces event-based)
- **Root problem:** `ProjectManagerSessionView` relied on `pm:dialog:open` broadcast events for initialization. If the event fired before the component was mounted (common during startup and stage switch), the session didn't load.
- **Solution:** `MainAreaSessionContent` now resolves `initialDialogIntent` from workflow state continuity chains and passes it as a prop. Session view renders in dialog mode immediately on first frame — no event timing dependency.
- `ProjectManagerSessionView` uses derived `effectiveIntent = dialogIntentOverride ?? initialDialogIntent` instead of internal state managed by useEffect. Zero intermediate renders, zero flashing.
- `pm:dialog:open` event listener retained only for runtime events (manual sidebar clicks). Startup and navigation no longer depend on it.
- After confirmation card Start, intent is passed via `onStarted(sessionId, intent)` callback to parent, which stores it as `stepStartedIntent`. This bypasses the stale `hasExistingStageSession` check (workflow state polling hasn't caught up yet).

### Fix: Workflow state polling jitter
- `WorkflowStateStore.startPolling()` now compares `updatedAt` of polled snapshot with current. Skips `emit()` if data unchanged — eliminates unnecessary re-renders every 10 seconds.
- `initialDialogIntent` stabilized via content comparison (`providerId + providerSessionId + stage`) instead of object reference. New object created only on actual session change.

### Fix: Session scope and empty state
- Removed hardcoded `startupStage="description"` from `ProjectManagerSessionView` — now receives dynamic stage from `activeTool`
- Replaced Description-specific empty state ("Начните с анкеты Description") with neutral "No active session" text
- Updated source dictionaries: `system_feedback.json`, `messages_for_the_user.json`

### Planning docs created
- `doc/SolidWorks-WorkFlow/Plans/StageConfirmationCard_Architecture.md` — accepted planning doc

## Known issues (for next session)
1. **Button spinner not visible in production** — CSS class `pm-confirmation-card__start-btn--starting` with `::before` pseudo-element not rendering despite specificity fix. Needs investigation of CSS load order or pm-provider-picker__button override.
2. **End-to-end Start flow needs testing** — v1.1.942 fixes prop-based intent after Start, but user hasn't tested this release yet. Previous releases (940, 941) had issues where session didn't appear after Start without manual stage switching.
3. **Periodic visual jitter during agent response** — user reported scrollbar appearing/disappearing when new agent messages arrive. Separate from polling jitter (which is fixed). Likely DOM layout shift from message rendering.

## Git commits
(ВАЖНО: при `Execution Scope Status: ACTIVE` следующая сессия обязана просмотреть каждый коммит через `git show --stat <hash>` и `git show <hash>`.)
- `3c3462713 feat: add stage confirmation card for trunk workflow step launch`
- `1437eab0e fix: pass active stage to session view instead of hardcoded description`
- `34e2703f6 fix: defer session resume on startup to avoid lost pm:dialog:open`
- `fbf6269f1 fix: replace description-specific empty state with neutral session text`
- `2e4282dfc fix: use requestAnimationFrame + setTimeout for session resume timing`
- `dd4ec40af fix: prop-based session intent replaces event-based startup`
- `8a8ec1685 fix: eliminate session view flashing with derived viewMode`
- `57d7293aa feat: smooth fade transition on confirmation card start`
- `57695362e fix: eliminate session view jitter from workflow state polling`
- `ad44efa40 fix: pass session intent via props after confirmation card start`
- Version bumps: `976cf1be2`, `9f3acb3cd`, `efb275742`, `a336601ac`, `19e5a3ea4`, `a47b5d8a5`, `33a3a4142`
- Docs: `b200dd333`, `e8d026b1a`, `2b1cd285f`, `329084d9b`

---

# 2. Instructions for Next Session

**Recovery Owner:** `doc/TODO/todo-plan.md`

## Plans for next session
- Продолжать активный execution scope по `doc/TODO/todo-plan.md`.
- Список документов для восстановления контекста находится только в активном `doc/TODO/todo-plan.md`.

## Key files modified this session
- `src/client/project-manager/components/shared/stage-confirmation-card.tsx` (NEW) — confirmation card component + helpers
- `src/client/project-manager/components/layout/main-area.tsx` — workflow snapshot, stepStartedIntent state, handleStepStarted callback
- `src/client/project-manager/components/layout/main-area-panel-content.tsx` — SessionContentProps extended, confirmation card branch, intent stabilization
- `src/client/project-manager/components/sessions/project-manager-session-view.tsx` — derived viewMode, initialDialogIntent prop, dialogIntentOverride
- `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx` — updated assertions
- `src/client/project-manager/components/layout/workspace-tree-auto-select.ts` — direct onResumeSession call (no setTimeout)
- `src/client/project-manager/services/workflow-state-store.ts` — skip emit on unchanged updatedAt
- `src/client/ui/src/session/empty-state.tsx` — neutral text
- `packages/ui/project-manager/styles.css` — confirmation card transition CSS, spinner CSS
- `doc/SolidWorks-WorkFlow/Plans/StageConfirmationCard_Architecture.md` (NEW)
- `doc/tmp/prototypes/development-tree-sidebar.html` — updated with confirmation card + transition demo

## Architecture decisions made
1. Session view receives intent as prop, not via broadcast event — scales to any number of sessions
2. viewMode derived from `effectiveIntent = override ?? prop` — no internal state, no intermediate renders
3. WorkflowStateStore skips emit on unchanged data — eliminates polling-induced re-renders
4. Confirmation card passes intent directly to parent on Start — no dependency on stale workflow state

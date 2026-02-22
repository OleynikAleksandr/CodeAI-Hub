# Session 098 — BUG-2026-02-22-01: SSOT input lock контракт + новый план (Phase 221)

**Date:** 2026-02-22 10:00 (CET)
**Branch:** main
**Version:** 1.1.645

---

# 1. Work Done in This Session

## Work summary
- Подтвердил текущую проблему после теста релиза `1.1.645`: UI больше не “залипает” на `Agent is working...`, но остаётся **вечно заблокированным** с copy `Agent is resuming your session... Please wait.`.
- Через локальный WebSocket Core (`/api/v1/stream`) снял фактический `workspace:snapshot` для `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-claude` и подтвердил, что **серверный SSOT уже “idle/unlocked”** для reviewer-сессии:
  - `turnState: "idle"`, `continuityLockActive: false`, `bindingStatus: "ready"`, `resumeMode: "resume_in_place"`.
- Снял `dialog:list:result` и подтвердил, что Core действительно возвращает `latestSessionId` равный runtime sessionId (reconciliation работает). Значит залипание теперь не из-за mismatch id.
- Выделил новый root cause (UI/PM): `applyWorkspaceSnapshotToSnapshots()` удерживает локальный `connectionState` в `blocked`, если переход идёт из `running/blocked` в `idle`, но при этом нет “разрешающего” lockReason (`allowIdleUnlock=false`). На cold start `continuityLockReason` часто отсутствует (`undefined`), поэтому UI **никогда** не принимает idle snapshot и остаётся locked.
- Сформулировал целевую архитектуру: один SSOT для input lock/unlock (Core snapshot), явные причины, state machine и правила восстановления после рестарта/аварий.

## Created/updated docs
- `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md` (новый контракт SSOT/state machine)
- `doc/TODO/todo-plan.md` (Phase 221)
- `doc/TODO/Archive/todo-plan-phase220-bug-2026-02-22-01-cold-start-mismatch-2026-02-22.md` (архив попытки Phase 220)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `db78b570 docs(contracts): define session input lock SSOT state machine`
- `d4e2d176 docs(todo): archive Phase 220 and start Phase 221`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
5. `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
6. `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
7. `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
8. `doc/TODO/todo-plan.md`
9. `doc/BugRegistry.md`
10. `doc/Sessions/Session098.md` (THIS REPORT)

## Plans for next session
- Реализовать Stream 1 из `doc/TODO/todo-plan.md`: тест + фикс в PM, чтобы idle snapshot снимал блокировку без требования явного lockReason.
- Реализовать Stream 2: сделать unlock‑reason явным на стороне Core (минимальный SSOT этап), чтобы UI не зависел от отсутствующих полей.
- Собрать релиз и прогнать ручную матрицу сценариев из контракта.

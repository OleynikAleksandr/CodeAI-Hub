# Session 025 — BUG-2026-02-24-04: Task timer total reset on Stop/Play

**Date:** 2026-02-24 18:44 (CET)
**Branch:** main
**Version:** 1.1.668

---

# 1. Work Done in This Session

## Work summary
- Заведён баг `BUG-2026-02-24-04`: в reviewer-сессии Stop → доп. сообщение → Play сбрасывает `taskTimer.total`.
- Core: добавили persistence для `taskTimer.totalSeconds` между Stop/Play рестартами Core (state-файл `~/.codeai-hub/state/task-timers.json`).
- Core: при shutdown коммитим running‑segment в total (для accumulative сессий), чтобы не терять прерванный turn.
- Core: при `workspace:select` инициализируем таймеры из persisted totals в `WorkspaceRuntimeFacade`, чтобы первый snapshot после рестарта уже содержал корректный total.
- Добавлен regression‑тест на сценарий Stop/Play (симуляция рестарта Core через `dispose()` + повторный `select`).
- Закрыт `BUG-2026-02-24-04` в реестре багов + обновлён контракт `SessionTaskTimer_UI.md`.

## Build / verification
- `npm run build:core`: ✅ success.
- `node --test --import tsx packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`: ✅ pass.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `d7443574 docs(bug): add BUG-2026-02-24-04 (reviewer stop/play total timer)`
- `8bea0e18 docs(todo): record Phase 245 planning hash`
- `96df1923 docs: start session 025 report`
- `a203d3f0 fix(core): preserve task timer total on stop`
- `8c128a63 docs(todo): mark Phase 245 Stream 1 done`
- `5fe2f19f test: prevent task timer total reset on stop/play`
- `242ce4dd docs(todo): mark Phase 245 Stream 2 test done`
- `61adf117 docs(bug): close BUG-2026-02-24-04`
- `637e47de docs(todo): mark Phase 245 Stream 2 closeout done`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/SessionTaskTimer_UI.md`
5. `doc/BugRegistry.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Archive/Session025.md` (THIS REPORT)

## Plans for next session
- Запушить изменения в `origin/main`.
- При необходимости: собрать релиз с фиксом `BUG-2026-02-24-04`.

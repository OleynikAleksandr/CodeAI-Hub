# Session 121 — Phase 111 Hotfix: Internal Workflow TurnState Lock + Release 1.1.530

**Date:** 2026-02-08 16:02 (CET)
**Branch:** main
**Version:** 1.1.530

---

# 1. Work Done in This Session

## Work summary
- Root cause ранней разблокировки ввода: internal workflow dispatch (`sendInternalMessage`) не эмитил `turn_state=running`, поэтому PM мог видеть `turnState=idle` и включать InputPanel во время Description collector / reviewer bootstrap.
- Исправлено: internal messages теперь участвуют в turn lifecycle (emit running, rollback to idle on errors) + добавлены core тесты.
- Прогнаны обязательные гейты качества и таргетные сборки.
- Собран релиз: `codeai-hub-1.1.530.vsix`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `06e468f2 fix(core): emit running turn state for internal messages`
- `e9129357 chore(qa): validate phase 111 internal message turn-state fix gates`
- `03f3dd30 docs(release): prepare release notes for phase 111 internal workflow turn-state fix`
- `597b6478 chore(release): run build-all for phase 111 internal workflow turn-state fix`
- `8df9fd53 chore(release): build and verify vsix for phase 111 internal workflow turn-state fix`
- `2ca71637 chore(plan): finalize phase 111 release stream hashes`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session121.md` (THIS REPORT)

## Plans for next session
1. Smoke-test `1.1.530` в PM UI:
   - Description collector: поле ввода всегда заблокировано на весь lifecycle (без editable состояния до terminal lock).
   - Reviewer: поле ввода разблокируется только после завершения turn (когда агент закончил ответ и ожидает следующий запрос пользователя).
2. Если smoke пройдёт: вернуться к Phase 106 backlog intake.

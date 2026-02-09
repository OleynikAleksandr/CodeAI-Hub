# Session 125 — Планирование Phase 115 (Strict Dual-Confirmation Unlock Gate)

**Date:** 2026-02-09 08:00 (CET)
**Branch:** main
**Version:** 1.1.533

---

# 1. Work Done in This Session

## Work summary
- Архивирован завершённый план `Phase 113-114`: `doc/TODO/Archive/todo-plan-phase114-release-1.1.533-2026-02-09.md`.
- Создан новый `doc/TODO/todo-plan.md` с `Phase 115` под исправление архитектурной ошибки unlock-логики: strict dual-confirmation gate (turn completed + explicit context decision).
- В новый план добавлены Stream по Core, Provider delivery, PM/UI lock enforcement, non-regression tests, Docs+QA и отдельный финальный Stream `Release Build`.
- Код не изменялся, выполнены только планирование и документация для следующей сессии реализации.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `75b4c817 docs(plan): archive phase 114 and define phase 115 strict unlock gate`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session125.md` (THIS REPORT)

## Plans for next session
- Реализовать `Phase 115` строго по новым инвариантам: unlock только после двух подтверждений (final turn + explicit no-rollover decision).
- Убрать окно `unlock -> relock` на межсобытийной гонке `turn_completed -> delayed token usage`.
- Добавить/обновить регрессионные тесты Core и PM для out-of-band event sequence.
- Обновить архитектурные документы синхронно с кодом и закрыть обязательные гейты.
- Выполнить финальный `Release Build` stream (`build-all` + `build-release --use-current-version`) и зафиксировать результаты в следующем session-отчёте.

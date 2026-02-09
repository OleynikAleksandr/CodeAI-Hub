# Session 116 — Phase 108 Planning: Snapshot Lock Monotonicity Hardening

**Date:** 2026-02-08 10:16 (CET)
**Branch:** main
**Version:** 1.1.526

---

# 1. Work Done in This Session

## Work summary
- Получен manual feedback по релизу `1.1.526`: input lock стал лучше, но всё ещё наблюдается ранний unlock с фликером `unlocked → locked` на границах continuity/handoff.
- Выполнено сравнение с референс-реализацией в репозитории `CodeAI-Hub-Claude` (Phase 106): там проблема решалась через разделение snapshot/event pipeline и `strengthen-only` правило.
- Для текущего snapshot-first дизайна (Codex) зафиксирован план Phase 108: snapshot-only anti-flicker (unlock-gating по terminal reason) + удержание lock на обеих сторонах handoff по transition graph, с обязательными non-regression тестами и release build для тестирования.
- В этой сессии код не менялся; обновлён только план работ.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `NO-COMMIT` Изменения только в документации (план + этот отчёт), коммиты не выполнялись.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session115.md`
4. `doc/Sessions/Session116.md` (THIS REPORT)
5. (reference) `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-Claude/doc/TODO/todo-plan.md` (Phase 106 — Separate Snapshot & Event Pipelines for ConnectionState)

## Plans for next session
- Реализовать `Phase 108 — Snapshot-First Lock Monotonicity Hardening` по Stream’ам из `todo-plan.md`.
- Прогнать обязательные гейты + таргетные сборки, затем выполнить `build-all` и `build-release` для тестового VSIX.
- Протестировать сценарии без unlock-gap:
  - `Description → Reviewer` auto-handoff.
  - Reviewer: старт → вопросы → ответы → финальный ответ.
  - Post-answer continuity/context triggers: lock не снимается преждевременно.

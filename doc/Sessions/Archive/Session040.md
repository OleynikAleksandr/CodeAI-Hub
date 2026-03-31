# Session 40 — Virtual Simulation cold start recovery plan (stuck lock + total timer)

**Date:** 2026-02-26 14:22 (CET)
**Branch:** main
**Version:** 1.1.687

---

# 1. Work Done in This Session

## Work summary
- Зафиксирован новый баг recovery для workflow-узла `virtual_simulation` (Virtual Simulation Cloud): после cold start UI может “залипать” в состоянии `working` с заблокированным вводом, несмотря на то, что в истории уже есть вопросы и ожидается user input.
- Обнаружен связанный симптом: `total` таймер в input footer может отображаться как `00h 00m 00s`, хотя persisted totals присутствуют в `.codeai-hub/state/task-timers.json` внутри workspace.
- Собрана high-signal фактура по состоянию workspace (`sessions/*.jsonl`, continuity-chain, persisted timers) и сформулирован контракт/границы фикса.
- Заархивирован предыдущий план (Phase 260) и создан новый TODO-план (Phase 261) под фиксы stuck-lock + total timer restore.

## Git commits
- (нет; текущая сессия — планирование/документация под реализацию в следующей сессии)

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_VirtualSimulation_ColdStartRecovery.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session040.md` (THIS REPORT)

## Plans for next session
- Выполнить Stream 0: подтвердить контракт и зафиксировать commit.
- Реализовать Streams 1–3 из Phase 261: regression tests + core fixes (stale running recovery, restore taskTimer totals on cold start).
- Выполнить Stream 4: PM UI smoke + синхронизация SSOT-доков при необходимости.
- Решить, нужен ли релизный Stream 5 (build-all/build-release) после фикса.

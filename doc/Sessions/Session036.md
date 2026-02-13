# Session 036 — Continuity Create-Report ACK/Retry и снятие блокировки UI

**Date:** 2026-02-13 11:07 (CET)
**Branch:** main
**Version:** 1.1.579

---

# 1. Work Done in This Session

## Контекст/проблема
- В Project Manager иногда (в основном у провайдера Codex) ломается «бесконечная сессия» на момент триггера rollover по порогу контекстного окна.
- Core отправляет internal turn `Flow Node Continuity — Create Report`, но сообщение иногда «теряется» (в provider rollout нет самого задания), из‑за чего:
  - файл отчёта не появляется (Core ждёт таймаут);
  - состояние сессии остаётся `working`;
  - UI навсегда показывает `Agent is working… Please wait.` и блокирует ввод.
- У Claude аналогичный сценарий отрабатывает стабильно (есть отчёты, ввод разблокируется), у Codex наблюдается «доставка в пустоту».

## Цель этой сессии
Сделать универсальный (для всех провайдеров) механизм завершения continuity:
- Добавить подтверждение доставки/старта (`ACK`) для internal `Create Report`.
- При отсутствии ACK и/или отчёта повторить запрос в ТУ ЖЕ provider session (resume в ту же сессию, без создания новой).
- После 2 попыток — гарантированно снять блокировку UI и показать пользователю явную ошибку (с причиной).

## Что уже сделано (по истории)
- В `packages/core/src/remote-bridge/handlers/session-request-handler.ts` введены:
  - `requestId` и стадии ожидания (включая `waiting_for_report_ack`).
  - хранение состояния попыток/таймштампов для create-report.
  - ожидание ACK и retry отправки create-report при отсутствии ACK.

## Текущее состояние (важно для продолжения)
- В рабочем дереве есть незакоммиченные изменения в `packages/core/src/remote-bridge/handlers/session-request-handler.ts`.
- В коде уже начали появляться элементы `continuity_failed` (нужно довести до завершения и зафиксировать отдельным коммитом).

## Git commits
(Нужно восстановить через `git show` в следующей сессии)
- `c14b9b32 docs(session): add session035 continuity ack/retry kickoff report`
- `d15c429c docs(todo): archive phase151 plan and start phase152`
- `28734670 docs(todo): refine phase152 streams and gates`
- `b2e7d30a fix(core): add continuity create-report request id and ack stage`
- `7bc46864 fix(core): retry continuity create-report when no ack received`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/TODO/todo-plan.md`
2. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`
3. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
4. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
5. (Для форензики Codex) логи/rollout в `~/.codeai-hub/providers/codex/home/sessions/...` и `~/.codeai-hub/logs/core/core.log`

## Plans for next session
1. Завершить core‑часть: после 2 попыток (ACK+report) эмитить `continuity_failed`, переводить сессию в `idle/ready` и гарантированно разблокировать UI.
2. Добавить обработку `continuity_failed` в UI: показать пользователю текст ошибки и не держать input заблокированным.
3. Обновить документы в `doc/SolidWorks-Flow/` (особенно `Stacks/CoreOrchestrator.md`) под новый протокол ACK/Retry.
4. Прогнать гейты и собрать новый релиз.

# Session 051 — PM Dialog Restore via dialogId (history replay)

**Date:** 2026-02-14 16:31 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** (TBD after release build)

---

# 1. Контекст и проблема

Цель этой сессии разработки: довести до 100% рабочее восстановление диалогов агентных "бесконечных" сессий в Project Manager после:
- перезапуска Core при живом PM;
- холодного старта PM (когда PM сам поднимает Core);
- закрытия вкладки (крестик) и повторного открытия через клик по дереву.

Текущая поломка: PM опирается на runtime `session:*` (список сессий из `/api/v1/status` и `session:history`), поэтому после рестарта Core runtime-сессии исчезают и PM не может открыть `Reviewer Codex` кликом (вкладка пустая / "No messages yet" / клик ничего не делает).

Архитектурный источник правды для решения (обязателен к просмотру при продолжении):
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

---

# 2. Решение (вкратце)

Разделяем две задачи:
1. Показать диалог: PM читает историю через Core команду `dialog:history` (Core читает накопительный JSONL `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`).
2. Отправлять сообщения: будет переключено позже на `dialog:send` (Phase 171). На Phase 170 фокус только на открытии/восстановлении/повторах.

PM должен оперировать стабильным ключом `dialogId`:
- хранить `openDialogIds[]`, `activeDialogId` и `treeBindings` в persistence (localStorage) per-workspace;
- при клике по дереву генерировать intent `pm:dialog:open` и открывать вкладку по `dialogId` даже если Core только что перезапущен и runtime-сессий нет;
- replay истории и live-стрим обязаны проходить через один и тот же dedupe/append пайплайн.

---

# 3. План этой сессии

Работа ведётся по `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md`, Phase 170 (PM restore), затем Phase 171 (send/live), затем Phase 172 (релиз).

## Что будет сделано в ближайших следующих сессиях разработки (если сработает автокомпакт)
- Завершить Phase 170 (PM открывает диалоги после рестарта Core через `dialog:list` + `dialog:history`).
- Затем Phase 171: `dialog:send` и обработка live `dialog:message`.
- Собрать новый patch release (Phase 172) и отдать на тест.

---

# 4. Work Done in This Session

## Work summary
- (TBD) Реализация PM dialog restore.

## Git commits
- (TBD) Будет заполнено по факту коммитов в этой сессии.

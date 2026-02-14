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

Ключевая поломка до фикса: PM опирался на runtime `session:*` (список сессий из `/api/v1/status` и `session:history`), поэтому после рестарта Core runtime-сессии пропадали и PM не мог открыть `Reviewer Codex` кликом (вкладка пустая / "No messages yet" / клик ничего не делает).

Архитектурный источник правды для решения (обязателен к просмотру при продолжении):
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

---

# 2. Решение (вкратце)

Разделили две задачи:
1. Показать диалог: PM читает историю через Core команду `dialog:history` (Core читает накопительный JSONL `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`).
2. Отправлять сообщения: оставлено на Phase 171 (`dialog:send` + live `dialog:message`).

В Phase 170 реализовано открытие диалога по клику в дереве через intent `pm:dialog:open` и восстановление истории через `dialog:list` + `dialog:history`.

---

# 3. Work Done in This Session

## Work summary
- Заархивирован старый `doc/TODO/todo-plan.md`, создан новый план под Phase 170-172.
- Реализован PM протокол `dialog:*` на WebSocket уровне (типы + `api.dialogs.*`).
- Добавлен `localStorage` store под `dialogId` (подготовка к cold start/restore).
- Изменён клик по узлу `Reviewer <provider>`: теперь диспатчит `pm:dialog:open` вместо resume runtime session.
- Реализован диалоговый режим отображения:
  - рефакторинг: runtime-view вынесен в `ProjectManagerRuntimeSessionView`.
  - новый `ProjectManagerDialogSessionView` восстанавливает диалог через `dialog:list` + `dialog:history` и показывает его даже после рестарта Core.
- Добавлен Phase 170 report.

## Git commits
- `81dea4cb docs(todo): reset plan for Phase170 PM dialog restore`
- `ec18aa8c docs(session): add Session051 (pm dialog restore plan)`
- `6bc726d9 feat(pm): add dialog WS commands to api`
- `860b8951 docs(todo): record Phase170 stream1 completion`
- `296d386d feat(pm): persist dialog tabs by dialogId`
- `7eb99bdc docs(todo): record Phase170 stream2 completion`
- `a0285526 feat(pm): tree click opens dialog intent`
- `4a6cd84c docs(todo): record Phase170 stream3 completion`
- `881f113d refactor(pm): extract runtime session view`
- `c8b24fd7 feat(pm): restore dialogs via dialog history after core restart`
- `000fbadc docs(todo): record Phase170 stream4 completion`
- `c447c1b0 docs(flow): phase170 report (pm dialog restore via history)`
- `04fe11fd docs(todo): record Phase170 report completion`

---

# 4. Instructions for Next Session

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase170.md`
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md`
4. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session051.md`

## Plans for next session
- Phase 171: реализовать `dialog:send` и обработку live `dialog:message` в PM (dedupe + merge в snapshots), снять read-only блокировку ввода.
- Затем Phase 172: собрать новый patch release (`./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`).

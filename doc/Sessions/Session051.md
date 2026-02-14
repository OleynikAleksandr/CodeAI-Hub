# Session 051 — PM Dialog Mode (history+send) + Patch Release 1.1.595

**Date:** 2026-02-14 17:20 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.595

---

# 1. Контекст и проблема

Цель работ: сделать "бесконечные" сессии агентных диалогов в Project Manager стабильными и предсказуемыми.

Симптомы до рефакторинга:
- После перезапуска Core (при живом PM) клики по `Reviewer Codex`/`Description` в дереве не открывали диалог, вкладка становилась пустой ("No messages yet") или ничего не происходило.
- Поведение отличалось между провайдерами; у Codex чаще проявлялось "зависание" UI, отсутствие истории, дубли.

Корневая причина: PM пытался работать как с "живыми" runtime-сессиями (`session:*` / `session:history`), но после рестарта Core runtime-объекты исчезают, и PM терял возможность восстановить диалог.

Архитектурный источник правды (обязателен к просмотру при продолжении):
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

---

# 2. Решение (вкратце)

Разделили две задачи и сделали их "dialog-first":

1. **Показать диалог**
- PM открывает вкладку не через runtime `sessionId`, а через `dialogId`.
- История восстанавливается через Core по командам `dialog:list` + `dialog:history`.

2. **Уметь отправлять и получать live**
- Отправка сообщений пользователя: `dialog:send` (Core сам резюмирует правильную provider-сессию по chain/continuity).
- Live-поток: Core шлет `dialog:message`, а PM мерджит их в отображение диалога с дедупликацией.

Это позволяет после рестарта Core заново поднять UI диалога на основе накопленной истории (и продолжить live, когда Core снова активен).

---

# 3. Work Done in This Session

## Work summary
- Phase 170: добавлен dialog-протокол в PM и режим открытия вкладки через intent `pm:dialog:open` с восстановлением истории через `dialog:history`.
- Phase 171: добавлена отправка через `dialog:send` и live-обновления через `dialog:message` (dedupe/merge).
- Phase 172: собран новый patch релиз **1.1.595**.
  - Tarballs:
    - `/Users/oleksandroliinyk/.codeai-hub/releases/*-1.1.595.tar.bz2`
    - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.595.tar.bz2`
  - VSIX:
    - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.595.vsix`

## Git commits (ключевые)
- `c8b24fd7 feat(pm): restore dialogs via dialog history after core restart`
- `83b773a2 feat(pm): send via dialogId`
- `7ac94d51 feat(pm): live dialog stream by dialogId`
- `8c4474bc fix(pm): satisfy webview typecheck for dialog events`
- `d20b1547 chore(release): build-all for next patch`
- `04e0f375 docs(todo): record patch release build`
- `32d97892 docs(todo): finalize patch release build record`

---

# 4. Instructions for Next Session

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase170.md`
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase171.md`
4. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase172.md`
5. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md`
6. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session051.md`

## Plans for next session
- Протестировать целевой сценарий, который раньше ломался:
  1) открыть PM, открыть `Reviewer Codex`,
  2) перезапустить Core при живом PM,
  3) закрыть вкладку крестиком и открыть кликом по дереву,
  4) убедиться, что история поднимается из `dialog:history` и ввод работает через `dialog:send`.
- Если останутся сбои: логировать (точечно) входы/выходы `pm:dialog:open`, `dialog:list/history/send`, и факт выбора workspace перед dialog-командами.

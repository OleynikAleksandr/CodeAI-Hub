# Session 134 — Postmortem: артефакты Idea Collector (Codex/Claude) и причины «не записалось на диск»

**Date:** 2026-01-17 13:20 CET
**Branch:** main
**Version:** 1.1.434

---

# 1. Work Done in This Session

## Work summary
- Перепроверены JSONL-логи Codex/Claude, на которые указывал пользователь, с фиксацией точных причин, почему система не сделала backup и не переписала артефакты на диске.
- Зафиксировано расхождение с предыдущими предположениями: у Claude structured output **присутствует**, но находится в `sdk:result.payload.structured_output`, а не приходит как `stream_event structured_output`/`artifacts[]` в пайплайн сохранения.
- Подготовлен чёткий план фикса для Claude на следующую сессию (унификация поведения с Codex/vscode-webview).

---

## Root cause A (Codex): «JSON/markdown пришёл в диалог вместо artifacts upsert»

**Лог:** `/Users/oleksandroliinyk/.codeai-hub/logs/codex/sdk-codex-019bcb97-df87-73a3-9c00-cedc219cf96d.jsonl` (с ~строки 20)

**Что видно в логе**
- Ответ модели пришёл как `sdk:item.completed` с `item.type="agent_message"` и полем `item.text`, внутри которого лежит текстовый JSON (`{"suggested_response":..., "artifacts":[...]}`), т.е. это **не** «structured output event» по контракту Variant B.

**Почему система не переписала файлы и не сделала backup**
- Пайплайн атомарной записи артефактов (с backup) запускается только при получении **структурированного** события с `artifacts[]` (Variant B) в ожидаемом месте/формате, а не при получении «ассистент напечатал JSON текстом».

**Что уже сделано ранее (фикс под vscode-webview)**
- В релизе **1.1.434** добавлено поведение: в сессиях `stage=idea` follow-up сообщения отправляются с Idea Collector `outputSchema` и `IdeaCollectorService` сохраняет артефакты даже после перезапуска UI.
- Это устраняет классическую причину «markdown в чат» для Codex, когда schema не прикладывается к follow-up.

---

## Root cause B (Claude): structured output есть, но артефакты не сохраняются/backup не делается

**Лог:** `/Users/oleksandroliinyk/.codeai-hub/logs/claude/sdk-claude-b4394839-f0a1-4586-99ec-64a3d4dea7c1.jsonl` (с ~строки 30)

**Что видно в логе**
- В `sdk:result.payload.structured_output` присутствуют:
  - `suggested_response`
  - `assessment`
  - `questions` (пусто)
  - `artifacts[]` со слотами (`cluster.idea.idea`, …) и markdown.
- При этом в этом же JSONL практически нет «обычных» `sdk:message`/`sdk:item.completed` с ролью assistant, из-за чего в UI пользователь может не увидеть текст (вопросы/summary), даже если structured output есть в `result`.

**Почему система не переписала файлы и не сделала backup**
- Текущий механизм сохранения Idea Collector артефактов привязан к событиям типа `stream_event`/`structured_output` (Variant B) и/или к событиям, которые доходят до UI/Core как «structured output event».
- В данном кейсе structured output находится в **финальном результате** (`sdk:result.payload.structured_output`) и, судя по симптомам, не конвертируется в тот же единый поток событий, который триггерит `artifact-upsert` и backup.

**Вывод:** у Claude проблема уже не в «schema не приклеили», а в **доставке/преобразовании structured output из result → в единый event-пайплайн сохранения артефактов**.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session134.md` (THIS REPORT)

## Plans for next session (Claude: сделать как у vscode-webview)
1) **Точно локализовать, где теряется structured output Claude**
- Проверить, где именно обрабатывается `sdk:result.payload.structured_output` в цепочке: Claude module → Core RemoteBridge → UI (Project Manager/вебвью).
- Цель: добиться, чтобы `structured_output.artifacts[]` из `result` генерировал тот же side-effect, что и `stream_event structured_output`: вызов `artifact-upsert` → atomic write → backup.

2) **Сделать единый инвариант по артефактам**
- Инвариант: артефакты не «печатаются в чат», а сохраняются только через `artifacts[]` (slot+markdown) и отображаются кратким summary.
- Для Claude: если structured output пришёл в `result`, модуль/бридж должен:
  - либо эмитить `stream_event` с `data.kind="structured_output"` и `artifacts[]`;
  - либо UI/Core должен уметь обрабатывать structured output из `result` и запускать persist так же, как для stream.

3) **Вернуть “текст в диалог” (suggested_response/questions)**
- Если `suggested_response` есть только в `sdk:result`, гарантировать публикацию короткого assistant сообщения в UI (без вставки полного markdown артефактов).

4) **Добавить smoke-check (ручной сценарий) для Claude**
- После «ОК/утверждаю»: на диске реально обновляются файлы артефактов (с backup) и в UI видно только summary, а не весь markdown.

## Git commits
- (no commits in this session)

# Session 048 — Codex session ID misrouting investigation

**Date:** 2026-01-04 16:28 (CET)
**Branch:** main
**Version:** 1.1.381

---

# 1. Work Done in This Session

## Work summary
- Проанализирован критический баг: сообщения пользователя после анкеты уходят в чужую Codex‑сессию (не Idea Collector).
- Собраны и разобраны логи `core.log`, `sdk-codex-*.jsonl`, `extension.log` — подтверждена ошибка `event_stream` и отсутствие ответа после user_input.
- Проведён аудит архитектуры маршрутизации sessionId между Codex SDK → Core → UI; найдено место, где sessionId перепривязывается без проверки.
- Обсуждены варианты защиты (lock‑once, collision‑guard, JSONL верификация, CODEX_HOME per‑session) и ограничения; код не менялся.
- Поиск в GitHub (openai/codex) на похожие проблемы resume/контекста: найдены смежные issues, прямого аналога “чужой thread_id на старте” не найдено.

## Git commits
(нет коммитов в этой сессии)

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session048.md` (THIS REPORT)

## Plans for next session
- Сформировать 100% гарантирующий дизайн фиксации `thread_id` для Codex (без JSONL‑хака и без CODEX_HOME per‑session, если возможно) и согласовать.
- Обновить архитектурный документ под выбранную стратегию (новый документ в `doc/Project_Docs/`).
- После утверждения — обновить `doc/TODO/todo-plan.md` и реализовать фиксацию sessionId/guardrails.
- Прогнать гейты и собрать релиз после исправлений.

---

# 3. Context & Findings (for next session)

## Симптомы
- В UI после ответа пользователя вместо ответа Idea Collector пришло: `[codex] {"type":"event_stream","error":{}}`.
- Сообщение пользователя продублировалось и ушло не в ту сессию.
- Пользователь работал на версии 1.1.380 (prompt ещё старый, это не причина бага).

## Логи
- `~/.codeai-hub/logs/core/core.log`:
  - `2026-01-04T13:22:11.421Z` и `2026-01-04T13:31:57.183Z` — `[codex] Codex event stream failed`, ошибка: `Codex Exec exited with code 1: Error: No such file or directory (os error 2)` из `codex-sdk-patches.js:163`.
- `~/.codeai-hub/logs/codex/sdk-codex-019b8900-3f1e-7963-8d8c-0eb16438620b.jsonl`:
  - последний `turn.completed` в `2026-01-04 14:03:41`, затем два `user_input` в `14:22:11` и `14:31:57` без ответа.
- `~/.codeai-hub/logs/extension/extension.log`:
  - только установка шаблона анкеты для 1.1.380, prompt‑installer не запускался.

## Ключевая архитектурная ошибка
Сессия Codex может быть перепривязана к новому thread_id без проверки:
- `packages/Codex_Module/src/messaging/message-processor.ts` → `handleThreadStarted()`:
  - при любом `thread.started` выполняется `sessionManager.updateSessionId(...)` и `sessionIdChanged`.
- `packages/Codex_Module/src/sdk/codex-sdk-patches.ts` → `patchedThreadRunStreamedInternal()`:
  - при любом `thread.started` выполняется `this._id = parsed.thread_id`.
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts` → `handleSessionIdChangedEvent()`:
  - Core принимает `sessionIdChanged` и обновляет `providerSessionId`, после чего новые сообщения уходят в другой thread.

Итог: если CLI вернул «чужой» thread_id (из‑за общего `~/.codex` и параллельных процессов), мы его принимаем и начинаем писать в чужую сессию.

## Обсуждённые варианты фикса
- Минимум: lock‑once `thread_id` + collision‑guard (не позволять перепривязку после первого bind).
- JSONL‑валидация (сверка первого запроса/ответа) — признана оверинжинирингом.
- CODEX_HOME per‑session — признано нежелательным (слишком тяжело).
- Требование пользователя: 100% гарантирующий способ избежать ошибки при старте сессии.

## Найденные внешние упоминания (GitHub openai/codex)
Прямого issue про «подмену thread_id на старте» не найдено, но есть устойчивые проблемы в resume‑пути:
- #8310 — resume продолжает в “wrong context” после compaction/limit: https://github.com/openai/codex/issues/8310
- #8256 — resume падает для конкретных сессий: https://github.com/openai/codex/issues/8256
- #6950 — resume теряет историю после crash: https://github.com/openai/codex/issues/6950
- #4163 — путаница сессий при resume, запрос на именование: https://github.com/openai/codex/issues/4163

Эти кейсы подтверждают хрупкость resume‑механизма и необходимость собственных guardrails.

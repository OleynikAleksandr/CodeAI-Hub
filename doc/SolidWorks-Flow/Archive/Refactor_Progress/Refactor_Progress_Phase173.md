# Phase 173 Report — Fix: dialog:send after continuity rollover

**Date:** 2026-02-14 17:45 (CET)
**Branch:** codex/phase156-unified-agent-dialog

## Симптом
После срабатывания триггера контекстного окна (continuity rollover) при отправке сообщения из PM в режиме диалога появлялось:
- `System: Failed to resume dialog session`
- сообщение пользователя не попадало в диалог.

## Причина
В Core, при `dialog:send`, если текущая provider-сессия уже сменена (новый `providerSessionId`), Core должен:
- либо найти in-memory сессию по `(providerId, providerSessionId)`,
- либо создать runtime session и сделать `adapter.resumeSession(providerSessionId)`.

Но перед `resumeSession` стояла валидация `validateProviderSessionExists`, которая проверяла наличие файла в **unified-session store** (`~/.codeai-hub/sessions/.../<providerId>/<providerSessionId>.jsonl`).

После перехода на «бесконечный» UI-диалог это неверно:
- unified-session history теперь пинится на `dialogId` (continuity root),
- файлов вида `<providerSessionId>.jsonl` может не быть,
- поэтому резюмэ после rollover ошибочно блокировалось.

## Исправление
- Убрана валидация через unified-session файл для resume.
- Добавлен `try/catch` вокруг `adapter.resumeSession` и `adapter.createSession`, чтобы ошибки возвращались как человекочитаемый текст.

## Изменения
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/core/src/remote-bridge/handlers/session-request-handler.ts`

## Коммит
- `529788cd fix(core): resume dialog session after continuity rollover`

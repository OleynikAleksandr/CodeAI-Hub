# Kimi Token Usage Status Planning

**Дата:** 2026-06-23
**Scope:** исправить отображение Kimi token usage в нижней status panel.

## Проблема

В нижней панели сессии поле `Токены` питается из `status.tokenUsage`, а не из account/subscription usage limits. Текущий Kimi adapter ожидает ACP `session/update` с `usage_update`, но в проверенных Kimi CLI wire logs такие события не появляются.

Нативный Kimi CLI при этом пишет после шага `usage.record` в `~/.kimi-code/sessions/.../<session_id>/agents/main/wire.jsonl`. В записи есть `inputOther`, `inputCacheRead`, `inputCacheCreation` и `output`. Сумма этих полей даёт best-effort снимок занятого контекста для последнего шага.

## Решение

Минимальный runtime fix:

- найти нативный Kimi `wire.jsonl` по provider session id после завершения turn;
- прочитать последний `usage.record` или `step.end.usage`;
- отправить существующим UI-путём `stream_event.data.tokenUsage = { used, limit }`;
- оставить UI без изменений.

## Ограничения

- Не смешивать этот поток с Kimi 5h/Weekly usage limits: это разные индикаторы.
- Не добавлять OCR, Tesseract или парсинг текста ответа.
- Не делать новый статусный UI, пока существующий `tokenUsage` path достаточно покрывает задачу.

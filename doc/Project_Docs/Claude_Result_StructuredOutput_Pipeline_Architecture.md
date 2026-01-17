# Архитектура: Claude structured_output из result → единый pipeline stream_event

**Date:** 2026-01-17
**Status:** Approved
**Target release:** 1.1.435 (planned)

---

## 1. Проблема

В Claude SDK structured output может приходить в финальном `result` (например `sdk:result.payload.structured_output`).
Текущий pipeline зависит от `stream_event` c `data.kind="structured_output"`, поэтому при отсутствии нормализованной доставки из `result`:
- артефакты Idea Collector не сохраняются (нет `artifact-upsert`),
- UI не получает краткий ответ (`suggested_response`).

## 2. Цели

1. Гарантировать доставку `structured_output` от Claude в общий pipeline `stream_event` независимо от формы ответа SDK.
2. Сохранять артефакты через `artifacts[]` (slot+markdown) и показывать только краткий `suggested_response` в UI.

## 3. Нецели

- Изменение контракта Idea Collector schema.
- Изменение Core API (эндпоинты остаются прежними).
- Миграция исторических логов.

## 4. Решение (инвариант)

### 4.1. Нормализация structured_output
Claude Module вводит резолвер structured output payload, принимающий:
- `message.structured_output` / `message.structuredOutput`
- `message.payload.structured_output`
- `message.result.payload.structured_output`

Нормализованный payload используется:
- для `extractVariantBArtifacts()` (`artifacts[]`)
- для извлечения `suggested_response`

### 4.2. Единый stream_event
Если `artifacts[]` валидны, `stream_event` эмитится даже когда structured output пришёл только в `result`.
UI сохраняет артефакты через `artifact-upsert`, не печатая markdown в диалог.

## 5. Контракты и точки интеграции

- **Claude Module**: нормализация structured output + emit `stream_event`.
- **UI**: без изменений, продолжает слушать `session:stream`.


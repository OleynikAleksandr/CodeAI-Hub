# Архитектура: Slim-контракт Structured Output для Idea Collector

**Статус:** Approved
**Дата:** 2026-01-05
**Версия:** 0.1

## Контекст и проблема
Анкета Idea Collector уже содержит полный перечень вопросов/ответов для структуры Idea.md. Текущий контракт Structured Output повторяет эти данные (conversation_state.collected), создавая дублирование и лишние токены. Нужно перейти к компактному контракту, который фокусируется на оценке готовности к финализации и умных уточняющих вопросах.

## Цели
- Убрать дублирование анкеты в Structured Output.
- Сохранить контроль качества финальных артефактов (Idea.md и virtual-simulation.md).
- Принудить агента задавать 1–3 умных вопроса, даже если анкета заполнена.
- Оценивать готовность к финализации по смыслу (достаточность данных), а не по количеству вопросов.

## Не цели
- Изменение формата анкеты или её структуры.
- Изменение pipeline auto-attach анкеты.
- Изменение механизмов сохранения артефактов.

## Ключевая идея
Structured Output становится «оценочным»:
- Агент возвращает краткую оценку готовности, рисков, допущений и пробелов.
- Агент всегда задаёт 1–3 уточняющих вопроса (кроме финализации).
- `finalize` возвращает полные документы Idea.md и virtual-simulation.md как markdown.
- `finalize` не одноразовый: при новых правках агент снова запрашивает подтверждение и возвращает полный finalize.

## Ограничения фильтра схемы (критично)
Core/UI нормализуют схему (strictify + prune), поэтому в контракте можно использовать только ключевые поля:
`type`, `properties`, `required`, `additionalProperties`, `items`, `description`.
Ключи вроде `enum`, `minItems`, `maxItems`, `pattern`, `minimum` и т.п. будут удалены.
Следствие: условия «вопросы 1–3» и «нет вопросов на finalize» обеспечиваются **prompt-правилом**, а не JSON Schema.

## Новый контракт (структура)
### Top-level поля
- `suggested_response`: человекочитаемый ответ для UI
- `assessment`: оценка готовности
- `questions`: 1–3 вопроса (на finalize — пустой список)
- `artifacts[]`: финальные артефакты (Variant B upsert)

### assessment (оценка)
- `ready_for_finalize` (bool)
- `confidence_percent` (0–100, ожидаемый порог: >= 80 для финализации)
- `missing_info` (список пробелов)
- `assumptions` (список допущений)
- `risks` (список рисков)

### questions (вопросы)
- Массив строк (1–3 вопроса)
- Всегда задаются до финализации
- Формируются по принципу «хватит ли этого для качественных Idea.md и virtual-simulation.md?»

### artifacts[] (артефакты, Variant B)
Массив элементов `{ slot, markdown }`:
- `slot`: `cluster.idea.idea` | `cluster.idea.virtual-simulation`
- `markdown`: полный markdown документа (не patch)

## Изменения в prompt
- Запрет на пересказ анкеты в Structured Output.
- Вопросы формулируются не по списку анкеты, а по качеству будущих документов.
- Если `confidence_percent >= 80` — просить подтверждение, а после «ОК» финализировать.
- Повторный `finalize` допускается при новых правках (с повторным подтверждением).
- На finalize не задавать вопросов, `questions` = [].

## Затрагиваемые компоненты
- `packages/agents/idea-collector/assets/idea-collector-schema.json`
- `packages/agents/idea-collector/assets/idea-collector-prompt.md`
- `src/client/ui/src/services/idea-collector-fallback-schema.ts`
- `src/client/ui/src/services/idea-collector-schema-utils.ts` (без изменений логики)
- `packages/core/src/remote-bridge/handlers/idea-contract-service.ts` (без изменений логики)
- `media/react-chat.js` (пересборка webview)

## Риски
- При отсутствии строгих JSON Schema-ограничений вопросы могут стать слишком общими — нужен жёсткий prompt.
- Требование «вопросы всегда» реализуется в prompt, а не в schema.

## Проверка
- При submit анкеты агент возвращает компактный JSON с `assessment` и `questions`.
- UI показывает `suggested_response` без пересказа анкеты.
- При `finalize` возвращаются полные Idea.md и virtual-simulation.md.
- `confidence_percent` отражает реальную готовность (>= 80 для финализации).

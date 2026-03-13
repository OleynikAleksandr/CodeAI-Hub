# SolidWorks-WorkFlow — каноническая документация (SSOT)

Цель: поддерживать минимальный и однозначный набор SSOT-документов для:
- восстановления контекста в начале сессии;
- синхронного обновления архитектуры при каждом изменении;
- быстрого выбора «куда смотреть и что править».

## Структура

- `System/` — описание системы целиком (глобальные инварианты, карта компонентов).
- `Clusters/` — подсистемы (Core Orchestrator, Project Manager).
- `Modules/` — модульные контуры (провайдеры, launcher, UI bundles).
- `Contracts/` — реализованные точечные контракты по механизмам и шагам workflow.
- `Plans/` — временные архитектурные planning-доки до `doc/TODO/todo-plan.md`.
- `Archive/` — исторические материалы (не SSOT).

## Текущая workflow-база (коротко)

- `Description` работает как single-agent flow с pre-submit/post-submit UX.
- Runtime templates для `Description`:
  - `questionnaire-template.md` (анкета),
  - `description-template.md` (Help),
  - `description-collector-prompt.md` (инструкции агента).
- Канонический выход шага: `Final_Description.md`.
- Встроенного reviewer-подшага внутри `Description` нет.

## Правила поддержания SSOT

1. Любой фикс/фича обновляет соответствующий SSOT-файл в `System/`, `Clusters/`, `Modules/` или `Contracts/`.
2. Новые planning-доки создаются только в `Plans/`; они не считаются SSOT текущей системы, пока не реализованы.
3. После реализации planning-док либо превращается в живой SSOT и переезжает в одну из SSOT-папок, либо архивируется/удаляется по смыслу.
4. В `Contracts/` описываем только реализованный контракт механизма/шага, без дублирования всей системы.
5. Legacy-доки держим как compat-редиректы и удаляем после исправления ссылок (`npm run check:links`).

## Навигация

Начинать всегда с `Docs_Index.md`.

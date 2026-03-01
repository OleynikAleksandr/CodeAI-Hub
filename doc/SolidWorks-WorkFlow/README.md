# SolidWorks-WorkFlow — каноническая документация (SSOT)

Цель: поддерживать минимальный и однозначный набор SSOT-документов для:
- восстановления контекста в начале сессии;
- синхронного обновления архитектуры при каждом изменении;
- быстрого выбора «куда смотреть и что править».

## Структура

- `System/` — описание системы целиком (глобальные инварианты, карта компонентов).
- `Clusters/` — подсистемы (Core Orchestrator, Project Manager).
- `Modules/` — модульные контуры (провайдеры, launcher, UI bundles).
- `Contracts/` — точечные контракты по механизмам и шагам workflow.
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
2. В `Contracts/` описываем только контракт механизма/шага, без дублирования всей системы.
3. Legacy-доки держим как compat-редиректы и удаляем после исправления ссылок (`npm run check:links`).

## Навигация

Начинать всегда с `Docs_Index.md`.

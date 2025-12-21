# Полный SDD workflow

## Конфигурация
- **Путь артефактов**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Шаги workflow

### [x] Шаг: Требования
<!-- chat-id: a70b3fbb-9665-4377-ab31-d432a9069cdf -->

Создать документ требований (PRD) на основе описания фичи.

1. Просмотреть текущую архитектуру и паттерны
2. Проанализировать фичу и выявить неясные аспекты
3. Запросить уточнения, влияющие на UX/объём работ
4. Принять решения по мелким деталям и зафиксировать допущения
5. Если уточнений нет, зафиксировать допущения и продолжить

Сохранить PRD в `{@artifacts_path}/requirements.md`.

Обязательный коммит: `docs: add codex default model requirements`

### [x] Шаг: Техническая спецификация
<!-- chat-id: cdbe290e-cea7-4613-ba55-41a15c0ea80e -->

Создать техническую спецификацию на основе `{@artifacts_path}/requirements.md`.

1. Зафиксировать контекст (языки, зависимости)
2. Описать подход к реализации с опорой на текущие паттерны

Сохранить в `{@artifacts_path}/spec.md` с разделами:
- технический контекст
- подход к реализации
- изменения в структуре исходников
- изменения в данных/API/интерфейсах
- фазы поставки (инкрементальные, проверяемые)
- стратегия верификации (lint/test)

Обязательный коммит: `docs: add codex default model spec`

### [x] Шаг: Планирование
<!-- chat-id: a81a8820-bd33-4457-b6da-2360aedda700 -->

Создать детальный план реализации на основе `{@artifacts_path}/spec.md`.

1. Разбить работу на конкретные задачи
2. Каждая задача должна ссылаться на контракты и включать шаги проверки
3. Заменить шаг "Реализация" ниже на полученные задачи

Правило: шаг должен быть цельным блоком работ (например, компонент/эндпоинт/тесты),
избегать слишком мелких или слишком больших шагов.

Если фича тривиальная и не требует полного SDD, удалить лишние шаги и
объяснить причину в плане.

Сохранить в `{@artifacts_path}/plan.md`.

Обязательный коммит: `docs: add codex default model plan`

### [ ] Step: Реестр моделей Codex и уровней reasoning

- Контракты: `doc/Knowledge/codex-models-official.json`, `doc/Knowledge/Codex_Model_Selection.md`.
- Задачи: создать общий модуль `src/types/codex-model-registry.ts` с типами моделей/уровней reasoning, списком рекомендованных моделей, описаниями уровней и дефолтами.
- Проверка: убедиться, что модуль используется в UI/extension без дублирования списка.

### [ ] Step: Расширение схемы настроек Codex

- Контракты: `settings.json` и поля из `{@artifacts_path}/spec.md`.
- Задачи: обновить `src/extension-module/settings/types.ts`, `src/extension-module/settings/settings-storage.ts`, `src/extension-module/settings/codex-settings.ts`, а также UI-состояние `src/client/ui/src/settings/settings-state-model.ts` и `src/client/ui/src/hooks/use-settings-state.ts`.
- Проверка: изменить модель в UI и проверить сохранение `defaultModel`/`reasoningByModel` в `~/.codeai-hub/settings/settings.json`, включая fallback для неизвестной модели.

### [ ] Step: UI карточка и окно reasoning

- Контракты: UX требования из `{@artifacts_path}/requirements.md`.
- Задачи: добавить компоненты `src/client/ui/src/components/settings/codex-default-model/`, подключить карточку и кнопку Configure reasoning в `src/client/ui/src/components/settings-view.tsx`, реализовать отдельное окно с уровнями reasoning и описаниями.
- Проверка: открыть Settings → Codex, выбрать модель, открыть отдельное окно reasoning, сохранить уровень и убедиться, что он отображается в карточке.

### [ ] Step: Интеграция с core/Codex Module

- Контракты: `{@artifacts_path}/spec.md` (defaultModel + reasoningByModel + ThreadOptions).
- Задачи: прочитать значения в `packages/core/src/config/index.ts`, пробросить через `packages/core/src/provider-registry/index.ts`, обновить `packages/Codex_Module/src/types/index.ts` и `packages/Codex_Module/src/sdk/codex-sdk-manager.ts` для передачи model/reasoning в ThreadOptions.
- Проверка: создать новую Codex-сессию и убедиться, что `ThreadOptions` используют выбранные значения.

### [ ] Step: Верификация и lint

- Контракты: стратегия верификации из `{@artifacts_path}/spec.md`.
- Задачи: выполнить `npx ultracite check`.
- Проверка: lint проходит без ошибок.

Обязательный коммит: `feat: add codex default model settings`

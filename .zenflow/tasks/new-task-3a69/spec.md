# Техническая спецификация: Codex Default model

## Технический контекст
- UI настроек — React webview (`src/client/ui`), состояние настраивается через `useSettingsState` и сообщения `settings:*`.
- Настройки хранятся в `~/.codeai-hub/settings/settings.json` через `src/extension-module/settings/settings-storage.ts`.
- Core читает конфиг из env (`packages/core/src/config/index.ts`), Codex-модуль принимает `defaultModel` в `CodexSDKManager`.
- Реестр моделей и описания reasoning — `doc/Knowledge/Codex_Model_Selection.md` и `doc/Knowledge/codex-models-official.json`.

## Подход к реализации
- Добавить статический реестр моделей/уровней reasoning (из официального JSON) как общий модуль для UI и нормализации настроек.
- Расширить Codex-настройки: `defaultModel` + `reasoningByModel` с валидацией и fallback на безопасные дефолты.
- Вкладка Codex: новая карточка **Codex Default model** с выбором модели и кнопкой **Configure reasoning**.
- Reasoning настраивается в отдельном окне (модал/диалог), где показываются уровни `low/medium/high/xhigh` и их описания.
- При запуске новой Codex-сессии использовать выбранную модель и её reasoning (проброс в core/Codex Module).

## Изменения в структуре исходников
- Новый общий реестр моделей: `src/types/codex-model-registry.ts` (или аналогичный shared-модуль).
- UI:
  - новые компоненты карточки/модалки в `src/client/ui/src/components/settings/codex-default-model/`;
  - обновление `settings-view.tsx` для показа карточки в Codex tab;
  - обновление `settings-state-model.ts` и `use-settings-state.ts` для новых полей и хендлеров.
- Extension settings:
  - `src/extension-module/settings/codex-settings.ts` — новые поля и normalize;
  - `src/extension-module/settings/types.ts` и `settings-storage.ts` — обновлённый snapshot.
- Core/Codex Module:
  - `packages/core/src/config/index.ts` — чтение default model/reasoning (env или settings.json);
  - `packages/core/src/provider-registry/index.ts` — проброс в Codex workspace options;
  - `packages/Codex_Module/src/types/index.ts` и `packages/Codex_Module/src/sdk/codex-sdk-manager.ts` — передача reasoning в `ThreadOptions` и запись `model_reasoning_effort` в `config.toml` (через `CODEX_HOME`).

## Изменения в данных/API/интерфейсах
- `settings.json`:
  - `providers.codex.defaultModel: string`
  - `providers.codex.reasoningByModel: Record<string, "low" | "medium" | "high" | "xhigh">`
- UI:
  - селект модели + отображение описания/статуса;
  - кнопка **Configure reasoning** открывает отдельное окно с уровнями и кнопками Save/Cancel.
- Core:
  - новый параметр `codexDefaultReasoningEffort` (рассчитан по `reasoningByModel[defaultModel]`);
  - `ThreadOptions` получают `model` и `modelReasoningEffort` (ключ уточнить по типам SDK).
- Codex CLI config:
  - `CODEX_HOME/config.toml` содержит строку `model_reasoning_effort = "<level>"` при включённом reasoning.
- Если сохранённая модель отсутствует в реестре — показать warning и использовать `gpt-5.2-codex` + `medium`.

## Фазы поставки
1. Реестр моделей и расширение схемы настроек (UI + extension).
2. UI карточка **Codex Default model** и модалка reasoning.
3. Интеграция с core/Codex Module для применения default model + reasoning.

## Стратегия верификации
- Открыть Settings → Codex, выбрать модель и reasoning, сохранить и проверить восстановление после перезапуска UI.
- Создать новую Codex-сессию и проверить, что `ThreadOptions` используют выбранные значения.
- Убедиться, что `CODEX_HOME/config.toml` содержит `model_reasoning_effort` для выбранной модели.
- Запустить `npx ultracite check`.

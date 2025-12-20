# Полный SDD workflow

## Конфигурация
- **Путь артефактов**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Этапы работы

### [x] Step: Требования
Создать PRD на основе описания задачи и сохранить в `{@artifacts_path}/requirements.md`.

### [x] Step: Техническая спецификация
Подготовить спецификацию в `{@artifacts_path}/spec.md` на базе PRD.

### [x] Step: Планирование
Детальный план реализации приведён ниже и заменяет общий шаг Implementation.

### [x] Step: Настройки автообновления (данные + storage)
<!-- chat-id: 94f08ca7-f844-4c75-8f2d-ed79611b217b -->
- Расширить `SettingsSnapshot` в `src/extension-module/settings/types.ts`.
- Перестроить `src/extension-module/settings` на логичную структуру:
  - отдельные файлы настроек для провайдеров (Claude: CLI/SDK + Thinking; Codex: CLI/SDK; Gemini: CLI/Core).
  - отдельный файл для `General` (Core Controls и будущие разделы).
  - общий слой хранения/миграции для всех секций.
- Обновить `SettingsMessageHandler` и `use-settings-state` для новой структуры.
- Проверка: `npm run typecheck:webview`.

### [x] Step: UI переключатели и статусы обновления
<!-- chat-id: 7da044fa-42e6-47e2-9d8c-c6c6c8bfa2ee -->
- Добавить тумблер автообновления в вкладках Claude/Codex/Gemini (`src/client/ui/src/components/settings/provider-versions.tsx`).
- Отобразить статус/прогресс ручных обновлений в карточке версий.
- Проверка: визуальный прогон UI (открыть Settings, проверить состояния).

### [x] Step: Сервис автообновления при старте ядра
<!-- chat-id: 0936a93e-d7cd-4b5b-969c-85deb295d446 -->
- Реализовать автообновление с блокировкой старта ядра (новый сервис + интеграция в `src/extension.ts`).
- Использовать `window.withProgress` для прогресса.
- Учитывать флаги автообновления из настроек.
- Проверка: запуск расширения и лог/прогресс обновления.

### [x] Step: Gemini global-only (installer + cli-bridge + версии)
<!-- chat-id: 96cdc520-bd7d-44e5-b780-64892f28f4da -->
- Удалить упоминания vendor в расширении и убедиться, что `~/.codeai-hub/providers/gemini/<version>/dist/vendor` больше не создаётся.
- Перевести `GeminiInstaller` на глобальную установку CLI/Core без vendor.
- В `cli-bridge.ts` резолвить `@google/gemini-cli-core` только из глобального npm.
- Упростить `GeminiVersionReader`/`ProviderVersionService` до глобального чтения версий.
- Проверка: запуск Gemini и чтение версий в Settings.

### [x] Step: Документация и проверка
<!-- agent: CODEX -->
<!-- chat-id: d11975fb-ab54-42b4-a29c-6bcbe94ed534 -->
- Обновить `doc/Project_Docs/Stacks/Gemini_CLI_Module.md` и `doc/Architecture/Architecture.md` при необходимости.
- Итоговая проверка: `npm run typecheck:webview` и ручной smoke-run.

### [x] Step: Документация и проверка
<!-- agent: CODEX -->

- Проверить и обновить актуальность всех документов в -
doc/Project_Docs/Stacks/
- Также обновить doc/Project_Docs/SystemArchitecture/SystemArchitecture.md
и doc/Project_Docs/SystemArchitecture/ProjectStructureMap.md

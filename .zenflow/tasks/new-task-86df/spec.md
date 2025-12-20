# Техническая спецификация: автообновление CLI/SDK и глобальный Gemini CLI Core

## Технический контекст
- Язык/стек: TypeScript, VS Code Extension API, React webview UI.
- Обновления выполняются через глобальный npm (`npm install -g`).
- Проверка версий: `ProviderVersionService` (`src/extension-module/settings/provider-version-service.ts`).
- Старт ядра: `src/extension.ts` → `prepareLocalRuntime()` → `initializeCoreManager()`.
- Gemini runtime: `packages/Gemini_Module/src/runtime/cli-bridge.ts` сейчас загружает CLI Core из vendor.

## Предлагаемая реализация
1. **Синхронное автообновление при старте ядра**
   - Добавить сервис автообновления (например, `ProviderAutoUpdateService`) в `src/extension-module/settings/` или `src/extension-module/runtime/`.
   - Использовать `ProviderVersionService` для сравнения `current` vs `latest` и установки `npm install -g` при расхождении.
   - В `prepareLocalRuntime()` вызывать автообновление *до* `initializeCoreManager()` и блокировать старт ядра.
   - Оборачивать процесс в `window.withProgress` (VS Code notification) для визуального статуса при запуске.
   - Учитывать настройку автообновления для каждого провайдера (если выключено — пропускать).

2. **Настройки автообновления в Settings UI**
   - Расширить `SettingsSnapshot` (`src/extension-module/settings/types.ts`) новым блоком, например:
     - `providerUpdates.autoUpdate: { claude: boolean; codex: boolean; gemini: boolean }`.
   - Обновить `claude-thinking-storage.ts` или добавить общий storage, чтобы хранить расширенную структуру.
   - Расширить `SettingsMessageHandler` и `use-settings-state` для загрузки/сохранения новой секции.
   - Во вкладках Claude/Codex/Gemini добавить карточку с переключателем автообновления рядом с версиями.

3. **UI прогресс для ручных и автообновлений**
   - Ручное обновление: сохранить `updatingTargets`, добавить явные статусы под карточкой версий.
   - Автообновление: показывать прогресс через `window.withProgress` и/или webview (если открыт) через новое событие (например, `settings:auto-update-progress`).

4. **Gemini CLI Core только из глобальной установки**
   - В `GeminiInstaller` убрать зависимость от vendor для `gemini-cli-core`:
     - `updateToLatest()` устанавливает *оба* пакета (`@google/gemini-cli`, `@google/gemini-cli-core`) глобально и получает `latest` по каждому пакету отдельно.
     - Удалить создание/обновление vendor каталога и `cli-bridge.json`.
   - В `cli-bridge.ts` заменить `CLI_CORE_DIR` на динамическое разрешение глобального пути:
     - Использовать `createRequire().resolve("@google/gemini-cli-core/package.json")`, `npm root -g`, `NODE_PATH`, `NPM_CONFIG_PREFIX` и `module.globalPaths`.
     - Ошибка при отсутствии глобального core (без fallback на vendor).
   - Обновить `GeminiVersionReader` и `ProviderVersionService`:
     - Убрать чтение версий из vendor.
     - Использовать общую логику `npm list -g`/`npm view` для Gemini так же, как Claude/Codex.

## Изменения структуры кода
- `src/extension.ts`: вставить синхронный шаг автообновления перед стартом ядра.
- `src/extension-module/settings/provider-version-service.ts`: добавить методы автообновления (например, `updateAllIfNeeded`), унифицировать чтение Gemini.
- `src/extension-module/settings/gemini-version-reader.ts`: убрать или упростить (переиспользовать общий механизм global npm).
- `src/extension-module/settings/types.ts`: расширить `SettingsSnapshot`.
- `src/extension-module/settings/claude-thinking-storage.ts`: миграция/хранилище для нового блока.
- `src/client/ui/src/components/settings/provider-versions.tsx`: добавить переключатель автообновления и отображение статуса.
- `src/client/ui/src/components/settings/use-settings-state.ts`: поддержка нового состояния и сохранения.
- `packages/Gemini_Module/src/installer/gemini-installer.ts`: перевести на global-only установку.
- `packages/Gemini_Module/src/runtime/cli-bridge.ts`: глобальное разрешение `@google/gemini-cli-core`.
- `doc/Project_Docs/Stacks/Gemini_CLI_Module.md` и `doc/Architecture/Architecture.md`: синхронизация описания механизма (опционально в рамках релиза).

## Модель данных и контракты
- `SettingsSnapshot`:
  - Добавить `providerUpdates.autoUpdate`.
- `SettingsMessage`:
  - Обновить сериализацию `settings:load`/`settings:save` для новой структуры.
- `ProviderVersionsSnapshot`:
  - Структура без изменений, но значения Gemini берутся из global npm.

## Этапы доставки
1. Настройки автообновления + UI (state, storage, переключатели, отображение статусов).
2. Автообновление при старте ядра (service + blocking flow + прогресс уведомление).
3. Перевод Gemini CLI/Core на global-only (installer + cli-bridge + version reader).
4. Обновление документации (если требуется для релиза).

## Проверка/валидация
- Проверка типов webview: `npm run typecheck:webview`.
- Линт (если актуально): `npx ultracite check`.
- Ручной прогон: запуск расширения → проверка прогресса автообновления → проверка Settings UI и версий.

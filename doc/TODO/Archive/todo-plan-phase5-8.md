# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
  - Каждая подзадача должна затрагивать не более 3 файлов.
  - Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
  - **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества -
`scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем выполняем таргетную сборку (`npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`).
  - **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
  - Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке (например, Claude → Codex → core), чтобы локализовать ошибки без запуска `build-all`.
  - **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/Architecture/Architecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.
  - Phase завершается на чистом дереве:
запускаем `./scripts/build-all.sh` (он поднимает версии и пересобирает модули/core/UI/launcher), затем на чистом дереве запускаем `./scripts/build-release.sh --use-current-version` для сборки VSIX, переносим tarball'ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
  - **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

---

## Phase 5 — Gemini CLI Path Isolation & Version Update (owner: Claude, updated: 2025-11-29)

**Цель:** Изолировать установку Gemini CLI от глобальной npm директории и обновить gemini-cli-core до 0.17.0
**Статус:** ✅ DONE

### Stream 5.1: Isolate GEMINI_INSTALLER_PATHS
1. [DONE] Изменить `GEMINI_INSTALLER_PATHS` в `packages/core/src/provider-registry/index.ts`
   - **Было:** `~/.npm-global/lib/node_modules/@google/gemini-cli/`
   - **Стало:** `~/.codeai-hub/providers/gemini/cli/`
   - Файлы: `packages/core/src/provider-registry/index.ts`

2. [DONE] Адаптировать `computePrefix()` в `gemini-installer.ts` для нового пути
   - Проверено: новый путь корректно обрабатывается (без /node_modules/ → возвращает 2 уровня вверх)
   - Результат: npm prefix = `~/.codeai-hub/providers/gemini/`

### Stream 5.2: Update gemini-cli-core to 0.17.0
1. [DONE] Обновить версии в `packages/Gemini_Module/package.json`
   - `codeaiHub.geminiCliCoreVersion`: `0.16.0` → `0.17.0`
   - `codeaiHub.geminiCliVersion`: `0.16.0` → `0.17.0`
   - `devDependencies.@google/gemini-cli`: `^0.16.0` → `^0.17.0`
   - `devDependencies.@google/gemini-cli-core`: `^0.16.0` → `^0.17.0`

2. [DONE] Обновить документацию Architecture.md
   - Добавлена информация об изолированном пути установки Gemini CLI (v1.1.316)

---

## Phase 6 — Gemini Update Button in Settings UI (owner: Claude, updated: 2025-11-29)

**Цель:** Добавить кнопку обновления Gemini в интерфейс Settings (аналогично Claude/Codex)
**Статус:** ✅ DONE

### Stream 6.1: Extend Message Types & Handler
1. [DONE] Расширить `SettingsMessage` тип для поддержки gemini
   - Добавлен `"gemini"` в union type `provider`
   - Добавлен `"core"` в union type `target`
   - Файлы: `src/extension-module/message-handlers/settings-message-handler.ts`

2. [DONE] Расширить `handleUpdateRequest` для обработки gemini
   - Добавлена валидация для gemini и core
   - Файлы: `src/extension-module/message-handlers/settings-message-handler.ts`

### Stream 6.2: Add updateGeminiCore to ProviderVersionService
1. [DONE] Добавить метод `updateGeminiCore()` в `ProviderVersionService`
   - Метод выполняет `npm install -g @google/gemini-cli-core@latest`
   - Файлы: `src/extension-module/settings/provider-version-service.ts`

2. [DONE] Расширить `updateTarget` для поддержки gemini
   - Добавлена специальная логика для `provider === "gemini" && target === "core"`
   - Файлы: `src/extension-module/settings/provider-version-service.ts`

### Stream 6.3: Update Settings UI Components
1. [DONE] Убрать `GeminiNotice` и добавить кнопку Update
   - Удалён компонент `GeminiNotice`
   - Добавлена кнопка Update для Gemini Core
   - Добавлен `target: "core"` в Gemini row data
   - Файлы: `src/client/ui/src/components/settings/provider-versions.tsx`

2. [DONE] Обновить `handleUpdateProvider` в `use-settings-state.ts`
   - Расширен тип для поддержки gemini и core
   - Файлы: `src/client/ui/src/components/settings/use-settings-state.ts`

3. [DONE] Обновить тип `VersionRow`
   - Добавлен `"core"` в target union type
   - Файлы: `src/client/ui/src/components/settings/provider-version-row.tsx`

---

## Phase 7 — Fix Gemini Update Mechanism (owner: Claude, updated: 2025-11-29)

**Цель:** Исправить механизм обновления Gemini CLI и Gemini CLI Core через Settings UI
**Статус:** ✅ DONE (v1.1.320)

**Финальные коммиты:**
- `9280d2c` fix(gemini): install CLI globally to ~/.npm-global
- `2cafc4a` fix(settings): use GeminiInstaller.updateToLatest() for vendor updates

**Проблема:** Текущая реализация использует `npm install -g` который ставит в глобальную директорию, но расширение использует vendor директорию внутри модуля.

**Требования:**
- gemini-cli и gemini-cli-core должны быть ОДНОЙ версии
- В Settings показывать ОБА пакета с версиями
- Кнопка Update обновляет ОБА пакета одновременно
- gemini-cli ставится: глобально (~/.npm-global/) + локально (vendor)
- gemini-cli-core ставится: только локально (vendor)
- Расширение использует ТОЛЬКО локальные версии из vendor

### Stream 7.1: Add updateToLatest() to GeminiInstaller
1. [DONE] Добавить метод `getLatestVersionFromRegistry()` в `gemini-installer.ts`
   - Получает latest версию из npm registry
   - Файлы: `packages/Gemini_Module/src/installer/gemini-installer.ts`
   - Коммит: `c6c39a1 feat(gemini): add updateToLatest() method for runtime CLI updates`

2. [DONE] Добавить метод `updateToLatest()` в `gemini-installer.ts`
   - Скачивает и распаковывает gemini-cli в vendor (через tarball)
   - Скачивает и распаковывает gemini-cli-core в vendor (через tarball)
   - Обновляет глобальную gemini-cli через `npm install -g @google/gemini-cli@{version}`
   - Файлы: `packages/Gemini_Module/src/installer/gemini-installer.ts`
   - Коммит: `c6c39a1`

3. [DONE] Экспортировать `updateToLatest()` через Gemini Module API
   - Экспортирован класс GeminiInstaller через index.ts
   - Добавлен тип GeminiUpdateResult для возвращаемого значения
   - Экспортирован GeminiInstallerOptions для правильного использования API
   - Файлы: `packages/Gemini_Module/src/index.ts`, `packages/Gemini_Module/src/types/index.ts`, `packages/Gemini_Module/src/installer/gemini-installer.ts`
   - Коммит: `31f285a feat(gemini): export updateToLatest() through module public API`

### Stream 7.2: Update GeminiVersionReader for both packages
1. [DONE] Расширить `GeminiVersionReader` для чтения версий обоих пакетов
   - Читать версию gemini-cli из vendor
   - Читать версию gemini-cli-core из vendor
   - Возвращать обе версии
   - Файлы: `src/extension-module/settings/gemini-version-reader.ts`
   - Коммит: `a11214b feat(settings): extend GeminiVersionReader to read both CLI and Core versions`

2. [DONE] Обновить `ProviderVersionsSnapshot` тип
   - Добавлен `gemini.cli` рядом с `gemini.core`
   - Добавлен `updateGeminiCli()` метод
   - Файлы: `src/extension-module/settings/provider-version-service.ts`
   - Коммит: `a11214b`

### Stream 7.3: Update Settings UI for Gemini
1. [DONE] Показывать две строки для Gemini в Settings
   - Gemini CLI (версия из vendor) - без кнопки Update
   - Gemini CLI Core (версия из vendor) - с кнопкой Update для обоих
   - Добавлен prop `showUpdateButton` в VersionRow
   - Файлы: `src/client/ui/src/components/settings/provider-versions.tsx`, `provider-version-row.tsx`
   - Коммит: `2c2f4f9 feat(settings): show both Gemini CLI and Core in Settings UI with single Update button`

2. [DONE] Подключить `updateGeminiAll()` к кнопке Update
   - Создан метод `updateGeminiAll()` который обновляет оба пакета
   - `updateTarget()` для gemini всегда вызывает `updateGeminiAll()`
   - Файлы: `src/extension-module/settings/provider-version-service.ts`
   - Коммит: `2c2f4f9`

### Stream 7.4: Cleanup incorrect paths
1. [DONE] Проверка мусорных папок `~/.codeai-hub/providers/`
   - Папки `bin/` и `lib/` НЕ существуют (структура уже правильная)
   - Текущая структура: `~/.codeai-hub/providers/gemini/1.1.317/`
   - Статус: cleanup не требуется

   ### Phase 8 — Документация и Релиз (owner: Claude, updated: 2025-11-29)

#### Stream 8.1: Обновление архитектурной документации
1. [DONE] Обновить `doc/Architecture/Architecture.md`
   - Добавлено описание механизма Gemini Update
   - Документированы vendor vs global пути установки
   - Обновлена секция Settings UI с описанием строк Gemini
   - Обновлён `doc/SolidWorks-Flow/Stacks/Gemini_CLI_Module.md`

#### Stream 8.2: Обновление README и CHANGELOG
1. [DONE] Обновить `README.md`
   - Добавлена фича обновления Gemini CLI/Core в список функций
   - Обновлён Current Release на v1.1.320
2. [DONE] Обновить `CHANGELOG.md`
   - Добавлена запись v1.1.320 со всеми изменениями Phase 5-7

#### Stream 8.3: Git Push и GitHub Release
1. [DONE] Разрешить расхождение веток (merge remote)
   - Коммит: `d60b7b3 merge: combine v1.1.320 (Gemini Update) with v1.1.317 (Project Manager)`
2. [DONE] Push на GitHub
3. [DONE] Релиз v1.1.320 опубликован в main, VSIX готов для GitHub release

**Phase 8 Status:** ✅ DONE


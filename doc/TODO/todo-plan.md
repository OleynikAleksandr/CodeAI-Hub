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

## Phase 1 — Gemini CLI Path Isolation & Version Update (owner: Claude, updated: 2025-11-29)

**Цель:** Изолировать установку Gemini CLI от глобальной npm директории и обновить gemini-cli-core до 0.17.0
**Статус:** ✅ DONE

### Stream 1.1: Isolate GEMINI_INSTALLER_PATHS
1. [DONE] Изменить `GEMINI_INSTALLER_PATHS` в `packages/core/src/provider-registry/index.ts`
   - **Было:** `~/.npm-global/lib/node_modules/@google/gemini-cli/`
   - **Стало:** `~/.codeai-hub/providers/gemini/cli/`
   - Файлы: `packages/core/src/provider-registry/index.ts`

2. [DONE] Адаптировать `computePrefix()` в `gemini-installer.ts` для нового пути
   - Проверено: новый путь корректно обрабатывается (без /node_modules/ → возвращает 2 уровня вверх)
   - Результат: npm prefix = `~/.codeai-hub/providers/gemini/`

### Stream 1.2: Update gemini-cli-core to 0.17.0
1. [DONE] Обновить версии в `packages/Gemini_Module/package.json`
   - `codeaiHub.geminiCliCoreVersion`: `0.16.0` → `0.17.0`
   - `codeaiHub.geminiCliVersion`: `0.16.0` → `0.17.0`
   - `devDependencies.@google/gemini-cli`: `^0.16.0` → `^0.17.0`
   - `devDependencies.@google/gemini-cli-core`: `^0.16.0` → `^0.17.0`

2. [DONE] Обновить документацию Architecture.md
   - Добавлена информация об изолированном пути установки Gemini CLI (v1.1.316)

---

## Phase 2 — Gemini Update Button in Settings UI (owner: Claude, updated: 2025-11-29)

**Цель:** Добавить кнопку обновления Gemini в интерфейс Settings (аналогично Claude/Codex)
**Статус:** ✅ DONE

### Stream 2.1: Extend Message Types & Handler
1. [DONE] Расширить `SettingsMessage` тип для поддержки gemini
   - Добавлен `"gemini"` в union type `provider`
   - Добавлен `"core"` в union type `target`
   - Файлы: `src/extension-module/message-handlers/settings-message-handler.ts`

2. [DONE] Расширить `handleUpdateRequest` для обработки gemini
   - Добавлена валидация для gemini и core
   - Файлы: `src/extension-module/message-handlers/settings-message-handler.ts`

### Stream 2.2: Add updateGeminiCore to ProviderVersionService
1. [DONE] Добавить метод `updateGeminiCore()` в `ProviderVersionService`
   - Метод выполняет `npm install -g @google/gemini-cli-core@latest`
   - Файлы: `src/extension-module/settings/provider-version-service.ts`

2. [DONE] Расширить `updateTarget` для поддержки gemini
   - Добавлена специальная логика для `provider === "gemini" && target === "core"`
   - Файлы: `src/extension-module/settings/provider-version-service.ts`

### Stream 2.3: Update Settings UI Components
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

# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества -
`scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем выполняем таргетную сборку (`npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`).
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке (например, Claude → Codex → core), чтобы локализовать ошибки без запуска `build-all`.
- **Real-time Документация**: 
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/Architecture/Architecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.
- Phase завершается на чистом деле: 
запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Phase 2 — Gemini Model Selection UI (owner: Gemini, updated: 2025-12-24)

### Stream 1: Core Registry & Extensions Types
1. [TODO] Создать реестр моделей Gemini в `src/types/gemini-model-registry.ts` на основе `doc/Knowledge/gemini-models-official.json`.
2. [TODO] Git Commit: feat(types): add gemini model registry
3. [TODO] Обновить типы и константы в расширении (`src/extension-module/settings/gemini-settings.ts`) для поддержки `defaultModel`.
4. [TODO] Git Commit: feat(extension): support gemini default model in settings
5. [TODO] Обновить маппинг настроек в расширении (`src/extension-module/settings/settings-storage.ts`), чтобы переменная окружения `GEMINI_DEFAULT_MODEL` обновлялась при сохранении.
6. [TODO] Git Commit: feat(extension): sync gemini default model environment variable

### Stream 2: UI State & Model Mapping
1. [TODO] Обновить `src/client/ui/src/components/settings/settings-state-raw.ts`, добавив `defaultModel` в `RawGeminiSettings`.
2. [TODO] Git Commit: feat(ui): add gemini default model to raw state
3. [TODO] Обновить `src/client/ui/src/components/settings/settings-state-model.ts`, добавив типизацию и маппинг для `defaultModel` в Gemini.
4. [TODO] Git Commit: feat(ui): map gemini default model in state model
5. [TODO] Обновить `src/client/ui/src/components/settings/use-settings-state.ts`, чтобы включить обработчик изменения модели Gemini.
6. [TODO] Git Commit: feat(ui): add gemini model change handler to useSettingsState

### Stream 3: Gemini Model Cards UI
1. [TODO] Создать компонент `GeminiDefaultModelCard` в `src/client/ui/src/components/settings/gemini-default-model/gemini-default-model-card.tsx`, используя `shared-model-card-styles.ts`.
2. [TODO] Git Commit: feat(ui): implement GeminiDefaultModelCard
3. [TODO] Интегрировать `GeminiDefaultModelCard` в основной экран настроек `src/client/ui/src/components/settings/general-settings.tsx`.
4. [TODO] Git Commit: feat(ui): integrate gemini model selection into settings view
5. [TODO] Проверить визуальное соответствие карточек Gemini карточкам Codex и Claude, выполнить финальные гейты качества.
6. [TODO] Git Commit: chore: final polish and quality gates for Gemini model selection

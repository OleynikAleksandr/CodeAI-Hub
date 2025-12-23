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

## Phase 1 — Claude Default Model release (owner: CodeAI Hub Team, updated: 2025-12-23)
### Stream: Claude Default Model release
1. [DONE] Синхронизировать выбор alias из Settings → Claude с `CLAUDE_DEFAULT_MODEL`, обновить UI/extension/core, документацию (`doc/Knowledge/Claude_Model_Aliases.md`, `doc/Architecture/Architecture.md`) и собрать релиз 1.1.338 (scope: `src/client/ui/src/components/settings/**`, `src/extension-module/**`, `packages/**`, `assets/**`, `media/react-chat.js`, `doc/Knowledge/Claude_Model_Aliases.md`, `doc/Architecture/Architecture.md`, `doc/tmp/releases/`, `codeai-hub-1.1.338.vsix`); target commit message `feat: release v1.1.338 - Claude default model`.
2. [DONE] Собрать релиз 1.1.339 (scope: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, `package.json`/`package-lock.json` версии, `assets/**/manifest.json`, `doc/tmp/releases/`, `codeai-hub-1.1.339.vsix`); target commit `feat: release v1.1.339 - Claude default model`.



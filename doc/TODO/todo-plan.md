# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Translation_LatinCyrillic_Spacing_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Translation_LatinCyrillic_Spacing_Architecture.md`
  - `doc/BugRegistry.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
  - Ручной прогон этих команд обычно не нужен (только для диагностики).
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке, чтобы локализовать ошибки без запуска `build-all`.
- **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.
- Phase завершается на чистом дереве:
запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Phase 0 — Execution Cycle Bootstrap (owner: Codex, updated: 2026-04-19)
### Stream: Planning Activation
1. [DONE] Открыть новый execution cycle: добавить active planning-doc в `doc/SolidWorks-WorkFlow/Plans/`, зарегистрировать его в `doc/SolidWorks-WorkFlow/Docs_Index.md` и заменить placeholder active планом выполнения в `doc/TODO/todo-plan.md`. scope: `doc/SolidWorks-WorkFlow/Plans/Translation_LatinCyrillic_Spacing_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: open translation spacing execution cycle`
2. [TODO] Git Commit: `docs: open translation spacing execution cycle` (hash: TBD)
3. [TODO] Добавить `OPEN` запись в `doc/BugRegistry.md` для spacing-багa на границе latin/cyrillic и зафиксировать её как текущий bug scope. scope: `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: register translation spacing bug`
4. [TODO] Git Commit: `docs: register translation spacing bug` (hash: TBD)

## Phase 1 — Shared Translation Spacing Repair (owner: Codex, updated: 2026-04-19)
### Stream: Shared Normalizer
1. [TODO] Добавить shared post-processor для spacing между latin/cyrillic вне protected code spans и подключить его в `TranslationFacade` перед финальным `TranslationResult`. scope: `packages/translation/src/translation-script-spacing-normalizer.ts`, `packages/translation/src/translation-facade.ts`; expected commit: `fix: normalize translation spacing between latin and cyrillic`
2. [TODO] Git Commit: `fix: normalize translation spacing between latin and cyrillic` (hash: TBD)
3. [TODO] Добавить regression tests для plain text, inline code и fenced code block кейсов. scope: `packages/translation/src/translation-facade.test.ts`; expected commit: `test: cover translation latin cyrillic spacing`
4. [TODO] Git Commit: `test: cover translation latin cyrillic spacing` (hash: TBD)

### Stream: Bug Notes Sync
1. [TODO] Обновить `doc/BugRegistry.md` implementation notes (root cause / fix / guards), не переводя баг в `FIXED` до пользовательской проверки нового релиза. scope: `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: sync translation spacing bug notes`
2. [TODO] Git Commit: `docs: sync translation spacing bug notes` (hash: TBD)

## Phase 2 — Verification And Release (owner: Codex, updated: 2026-04-19)
### Stream: Targeted Verification
1. [TODO] Прогнать таргетные проверки translation path: unit tests, `npm run build --workspace @codeai-hub/translation`, при необходимости `npm run build --workspace @codeai-hub/core`, и зафиксировать результаты в closeout docs. scope: `@codeai-hub/translation`, `@codeai-hub/core`, `doc/TODO/todo-plan.md`; expected commit: `test: verify translation spacing normalization`
2. [TODO] Git Commit: `test: verify translation spacing normalization` (hash: TBD)

### Stream: Release Notes And New Release Build
1. [TODO] Подготовить будущую release line `1.2.24`: обновить `README.md`, `CHANGELOG.md` и связанные архитектурные документы под shared translation spacing fix до запуска release scripts. scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`; expected commit: `docs: prepare 1.2.24 release notes`
2. [TODO] Git Commit: `docs: prepare 1.2.24 release notes` (hash: TBD)
3. [TODO] Выполнить release checklist: чистое дерево, `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, проверить release artefacts, заархивировать completed plan, закрыть planning-doc, подготовить новый session report и вернуть active `todo-plan.md` в placeholder. scope: release pipeline / generated manifests / closeout docs; expected commit: `build: release 1.2.24`
4. [TODO] Git Commit: `build: release 1.2.24` (hash: TBD)

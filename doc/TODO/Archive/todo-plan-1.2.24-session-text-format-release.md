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
2. [DONE] Git Commit: `docs: open translation spacing execution cycle` (hash: `bdd7105e1`)
3. [DONE] Обновить active planning-doc и добавить `OPEN` записи в `doc/BugRegistry.md` для shared text-format scope: spacing-багa на границе latin/cyrillic и paragraph-boundary бага у standalone bold section titles в thinking blocks. scope: `doc/SolidWorks-WorkFlow/Plans/Translation_LatinCyrillic_Spacing_Architecture.md`, `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: register translation text formatting bugs`
4. [DONE] Git Commit: `docs: register translation text formatting bugs` (hash: `ccf0f3a6a`)
5. [DONE] Расширить active planning-doc и `doc/BugRegistry.md` ordinary-assistant markdown list spacing багом, так как raw content уже корректен и дефект локализован в UI render layer. scope: `doc/SolidWorks-WorkFlow/Plans/Translation_LatinCyrillic_Spacing_Architecture.md`, `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: add markdown list spacing bug scope`
6. [DONE] Git Commit: `docs: add markdown list spacing bug scope` (hash: `69b3c933b`)

## Phase 1 — Shared Text Formatting Repair (owner: Codex, updated: 2026-04-19)
### Stream: Translation Text Normalizer
1. [DONE] Добавить shared text-format normalizer с protected code spans, script-spacing repair и standalone bold section boundary repair, экспортировать его из translation package и подключить в `TranslationFacade`. scope: `packages/translation/src/translation-text-format-normalizer.ts`, `packages/translation/src/translation-facade.ts`, `packages/translation/src/index.ts`; expected commit: `fix: normalize translation text formatting`
2. [DONE] Git Commit: `fix: normalize translation text formatting` (hash: `9b8bdd9af`)
3. [DONE] Добавить regression tests для spacing, protected code spans и standalone bold section title paragraph boundaries на translation path. scope: `packages/translation/src/translation-facade.test.ts`; expected commit: `test: cover translation text formatting`
4. [DONE] Git Commit: `test: cover translation text formatting` (hash: `1e360a8d6`)

### Stream: Session Message Display Formatting
1. [DONE] Применить shared normalizer к Core assistant/thinking display content и localized overlays, чтобы paragraph-boundary repair работал для всех providers на user-facing surface. scope: `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`, `packages/core/src/session-translation/session-message-localization-projector.ts`; expected commit: `fix: normalize thinking display formatting`
2. [DONE] Git Commit: `fix: normalize thinking display formatting` (hash: `a507b396c`)
3. [DONE] Расширить Core-side paragraph-boundary normalization с `thinking` на обычные assistant messages и синхронизировать active planning wording с пользовательским уточнением, что дефект воспроизводится не только в reasoning. scope: `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`, `doc/SolidWorks-WorkFlow/Plans/Translation_LatinCyrillic_Spacing_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `fix: broaden session message formatting normalization`
4. [DONE] Git Commit: `fix: broaden session message formatting normalization` (hash: `ac1e9d1db`)
5. [DONE] Добавить regression tests для Core assistant/thinking source content и localized overlays с glued standalone bold section titles. scope: `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts`, `packages/core/src/session-translation/session-message-localization-projector.test.ts`; expected commit: `test: cover thinking display formatting`
6. [DONE] Git Commit: `test: cover thinking display formatting` (hash: `2b0adf0e0`)

### Stream: Session Markdown List Spacing
1. [DONE] Убрать inflated blank spacing в nested markdown lists обычных assistant messages, не меняя raw stored message content и не трогая thinking/translation path. scope: `media/session-view.css`; expected commit: `fix(ui): collapse nested markdown list spacing`
2. [DONE] Git Commit: `fix(ui): collapse nested markdown list spacing` (hash: `f8f3feff1`)

### Stream: Bug Notes Sync
1. [DONE] Обновить `doc/BugRegistry.md` implementation notes (root cause / fix / guards) для всех трёх formatting-багов, не переводя их в `FIXED` до пользовательской проверки нового релиза. scope: `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: sync text formatting bug notes`
2. [DONE] Git Commit: `docs: sync text formatting bug notes` (hash: `3acbbb570`)

## Phase 2 — Verification And Release (owner: Codex, updated: 2026-04-19)
### Stream: Targeted Verification
1. [DONE] Прогнать таргетные проверки text-format path: relevant unit tests, `npm run build --workspace @codeai-hub/translation`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`; interactive UI smoke-check ordinary assistant nested list spacing перенести на пользовательскую release-проверку и зафиксировать это в closeout docs. scope: `@codeai-hub/translation`, `@codeai-hub/core`, `webview`, `doc/TODO/todo-plan.md`; expected commit: `test: verify text formatting normalization`
2. [DONE] Git Commit: `test: verify text formatting normalization` (hash: `4279fef5b`)

### Stream: Release Notes And New Release Build
1. [DONE] Подготовить будущую release line `1.2.24`: обновить `README.md` и `CHANGELOG.md` под shared text-format fix set; дополнительных contract-delta beyond active planning-doc / BugRegistry для этого scope не требуется. scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.24 release notes`
2. [DONE] Git Commit: `docs: prepare 1.2.24 release notes` (hash: `c85789e66`)
3. [DONE] Выполнить release checklist: чистое дерево, `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, проверить release artefacts, заархивировать completed plan, закрыть planning-doc, подготовить новый session report и вернуть active `todo-plan.md` в placeholder. Результат: `./scripts/build-all.sh` успешно поднял unified version до `1.2.24`, пересобрал provider/core/UI/CEF artefacts и обновил manifests; `./scripts/build-release.sh --use-current-version` успешно прошёл Step 7 SDK exclusions, Step 7.5 artefact validation, markdown link check, duplication check, dev-dependency prune/restore и собрал `codeai-hub-1.2.24.vsix`. scope: release pipeline / generated manifests / closeout docs; expected commit: `build: release 1.2.24`
4. [DONE] Git Commit: `build: release 1.2.24` (hash: `d73aca8d6`)

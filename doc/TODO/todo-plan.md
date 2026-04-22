# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Cycle:** 1.2.55 — PM Translation Engine Selector Crash Fix

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/PM_TranslationEngineSelector_CEF_Crash_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/PM_TranslationEngineSelector_CEF_Crash_Architecture.md`
  - `doc/BugRegistry.md`
  - `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `src/client/ui/src/components/settings/localization-translation-engine-selector.tsx`
  - `src/client/ui/src/components/settings/localization-settings-card.tsx`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из `Phase` и `Stream`; каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту конкретная подзадача требует больше 3 файлов, она обязана быть разбита на более мелкие пункты прямо в этом `todo-plan.md` до продолжения работы.
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Таргетные сборки затронутых пакетов/клиентов обязательны перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run build:project-manager`, `npm run typecheck:webview`.
- **Commit:** после зелёных гейтов и синхронизации документации.
- **Real-time Документация:** любые изменения архитектуры/логики синхронно отражаются в `doc/` до соответствующего коммита.
- Phase завершается на чистом дереве; релизный rebuild выполняется отдельным последним Stream по инструкции release checklist.
- `doc/TODO/todo-plan.md` обновляется в реальном времени после каждой подзадачи и каждого коммита.

## Phase 1 — PM Translation Engine Selector Stabilization (owner: Codex, updated: 2026-04-22)

### Stream A: Intake + crash boundary
1. [DONE] Зафиксировать standalone PM crash на `UI Translation Engine`, открыть planning cycle и определить запрет на native `<select>` для translation-engine controls в CEF/macOS path. scope: `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Plans/PM_TranslationEngineSelector_CEF_Crash_Architecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: plan translation engine selector crash fix`
2. [DONE] Git Commit: `docs: plan translation engine selector crash fix` (hash: `b013477e5`)

### Stream B: Custom translation engine selector
1. [DONE] Заменить native `<select>` в shared `TranslationEngineSelector` на DOM-owned selector/listbox, чтобы убрать AppKit-native popup trigger из PM localization settings и сохранить availability UX; подтвердить исправление таргетными сборками `npm run build:webview` и `npm run build:project-manager`. scope: `src/client/ui/src/components/settings/localization-translation-engine-selector.tsx`; ожидаемый commit message: `fix(settings): replace native translation engine select`
2. [DONE] Git Commit: `fix(settings): replace native translation engine select` (hash: `bbdbc2b1e`)

### Stream C: SSOT sync
1. [DONE] Синхронно обновить bug history и SSOT под новый `no-native-select-for-translation-engine` contract в shared settings UI / standalone CEF path. scope: `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`; ожидаемый commit message: `docs: sync translation engine selector crash contract`
2. [DONE] Git Commit: `docs: sync translation engine selector crash contract` (hash: `b10512136`)

## Phase 2 — Release 1.2.55 (owner: Codex, updated: 2026-04-22)

### Stream D: Release metadata 1.2.55
1. [DONE] Перед release rebuild обновить `README.md` и `CHANGELOG.md` на будущую версию `1.2.55` под translation-engine selector crash fix. scope: `README.md`, `CHANGELOG.md`; ожидаемый commit message: `docs: prepare 1.2.55 release metadata`
2. [TODO] Git Commit: `docs: prepare 1.2.55 release metadata` (hash: TBD)

### Stream E: Release rebuild 1.2.55
1. [TODO] На чистом дереве выполнить `./scripts/build-all.sh --version 1.2.55`, проверить release-generated version/manifests artefacts и закоммитить результат. scope: release-generated repo files; ожидаемый commit message: `chore: release 1.2.55`
2. [TODO] Git Commit: `chore: release 1.2.55` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить `Step 7: Verifying SDK exclusions`, pruning dev dependencies и итоговый VSIX `codeai-hub-1.2.55.vsix`.

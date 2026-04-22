# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Cycle:** 1.2.54 — PM Settings In-Shell Stabilization

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/PM_Settings_InShell_Stabilization_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/PM_Settings_InShell_Stabilization_Architecture.md`
  - `doc/BugRegistry.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
  - `src/client/project-manager/components/layout/main-area.tsx`
  - `src/client/project-manager/components/layout/main-area-panel-content.tsx`
  - `src/client/project-manager/api.ts`
  - `src/client/project-manager/components/settings/use-project-manager-settings-state.ts`
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

## Phase 1 — PM Settings Stabilization (owner: Codex, updated: 2026-04-22)

### Stream A: Intake + architecture pivot
1. [DONE] Зафиксировать batch регрессий `1.2.53` в `BugRegistry` и открыть новый planning cycle для in-shell PM Settings takeover, restart recovery restoration и save/localization UX alignment. scope: `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Plans/PM_Settings_InShell_Stabilization_Architecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: plan pm settings stabilization`
2. [DONE] Git Commit: `docs: plan pm settings stabilization` (hash: `33c12f370`)

### Stream B: In-shell Settings surface
1. [DONE] Перевести Settings из popup-path в in-shell режим правой панели PM: `MainArea` должен открывать settings takeover внутри текущего окна и возвращать прежний right-panel context после close. scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`; ожидаемый commit message: `feat(pm): host settings inside main area`
2. [DONE] Git Commit: `feat(pm): host settings inside main area` (hash: `cc98d7713`)
3. [DONE] Удалить detached settings route и popup opener seam из PM после перевода Settings в in-shell surface. scope: `src/client/project-manager/app.tsx`, `src/client/project-manager/components/layout/main-layout.tsx`, `src/client/project-manager/components/layout/use-detached-settings-window.ts`; ожидаемый commit message: `chore(pm): remove detached settings window`
4. [DONE] Git Commit: `chore(pm): remove detached settings window` (hash: `179eaaf2e`)

### Stream C: Restart Core recovery contract
1. [DONE] Добавить в PM API restart transport + synthetic core-control feedback, чтобы PM Settings могли показывать restart lifecycle без legacy extension-only handler. scope: `src/client/project-manager/api.ts`, `src/client/project-manager/services/project-manager-core-restart-tracker.ts`, `src/client/project-manager/components/settings/use-project-manager-settings-state.ts`; ожидаемый commit message: `feat(pm): add core restart transport`
2. [DONE] Git Commit: `feat(pm): add core restart transport` (hash: `a05fa9c61`)
3. [DONE] Вернуть shared `Core Controls` в PM General tab и снять PM-specific запрет на `Restart Core`. scope: `src/client/ui/src/components/settings-view.tsx`; ожидаемый commit message: `fix(pm): restore restart core in settings`
4. [DONE] Git Commit: `fix(pm): restore restart core in settings` (hash: `123125555`)
5. [DONE] Добавить standalone launcher restart primitive для PM host bridge вместо fallback `ensure-started`. scope: `packages/cef-launcher/src/core_launcher.h`, `packages/cef-launcher/src/core_launcher.cc`; ожидаемый commit message: `feat(launcher): add core restart primitive`
6. [DONE] Git Commit: `feat(launcher): add core restart primitive` (hash: `8f69ae002`)
7. [DONE] Подключить launcher JS bridge к restart primitive, чтобы PM restart request работал в standalone CEF-host так же, как в VS Code-host. scope: `src/client/ui/src/core-bridge/supervisor-requests.ts`, `packages/cef-launcher/src/launcher_handler_bridge_helpers.h`, `packages/cef-launcher/src/launcher_handler.cc`; ожидаемый commit message: `feat(launcher): wire restart bridge`
8. [DONE] Git Commit: `feat(launcher): wire restart bridge` (hash: `f15310b91`)

### Stream D: Save/localization UX stabilization
1. [DONE] Прокинуть actual `localizationSyncStatus` в shared settings state contract для обоих host-paths (`VS Code webview` и `Project Manager`). scope: `src/client/ui/src/components/settings/use-settings-state-support.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`, `src/client/project-manager/components/settings/use-project-manager-settings-state.ts`; ожидаемый commit message: `feat(settings): expose localization sync status`
2. [DONE] Git Commit: `feat(settings): expose localization sync status` (hash: `b413fd7f1`)
3. [DONE] Ограничить overlay `Synchronizing localization` только реальным strict sync busy-state, не показывая его на provider-only saves. scope: `src/client/ui/src/components/settings-view.tsx`; ожидаемый commit message: `fix(settings): gate localization overlay by sync status`
4. [DONE] Git Commit: `fix(settings): gate localization overlay by sync status` (hash: `75135ca08`)

## Phase 2 — SSOT Sync + Release 1.2.54 (owner: Codex, updated: 2026-04-22)

### Stream E: Documentation sync
1. [DONE] Синхронно обновить SSOT под in-shell PM Settings, restored restart recovery contract и corrected save/localization UX. scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; ожидаемый commit message: `docs: sync pm settings stabilization contract`
2. [DONE] Git Commit: `docs: sync pm settings stabilization contract` (hash: `69e1dab92`)
3. [DONE] Синхронно закрыть batch-регрессии `1.2.53` в `BugRegistry` и обновить Launcher CEF SSOT под новый PM restart bridge contract (`codeai://core-restart` + `RestartCoreProcess`). scope: `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`; ожидаемый commit message: `docs: close pm settings stabilization bugs`
4. [DONE] Git Commit: `docs: close pm settings stabilization bugs` (hash: `689938320`)

### Stream F: Release metadata 1.2.54
1. [DONE] Перед release rebuild обновить `README.md` и `CHANGELOG.md` на будущую версию `1.2.54` под PM Settings stabilization fixes. scope: `README.md`, `CHANGELOG.md`; ожидаемый commit message: `docs: prepare 1.2.54 release metadata`
2. [DONE] Git Commit: `docs: prepare 1.2.54 release metadata` (hash: `fd6c689d2`)

### Stream G: Release rebuild 1.2.54
1. [DONE] На чистом дереве выполнить `./scripts/build-all.sh --version 1.2.54`, проверить release-generated version/manifests artefacts и закоммитить результат. scope: release-generated repo files; ожидаемый commit message: `chore: release 1.2.54`
2. [DONE] Git Commit: `chore: release 1.2.54` (hash: `ad06f74e3`)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить `Step 7: Verifying SDK exclusions`, pruning dev dependencies и итоговый VSIX `codeai-hub-1.2.54.vsix`.

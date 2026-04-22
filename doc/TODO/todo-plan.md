# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_BootstrapHardening_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
  - `doc/BugRegistry.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов или 3 пакетов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit`.
- Любое архитектурное изменение синхронно отражается в SSOT/bug docs до коммита.
- Таргетная верификация для этого цикла: `./scripts/build-cef-launcher.sh --force`.
- Phase завершается на чистом дереве через `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`.

## Phase 1 — CEF macOS bootstrap hardening (owner: Codex, updated: 2026-04-22)
### Stream: Scope bootstrap
1. [DONE] Создать planning-doc, формализовать launcher/usage-limits баги в `BugRegistry`, активировать новый `todo-plan` (scope: `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_BootstrapHardening_Architecture.md`, `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: open CEF mac bootstrap hardening scope`)
2. [DONE] Git Commit: `docs: open CEF mac bootstrap hardening scope` (hash: `e4df54f94`)

### Stream: Native bootstrap scaffold
3. [DONE] Добавить custom `NSApplication` + delegate scaffolding для mac launcher bootstrap (scope: `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.h`, `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.mm`, `doc/TODO/todo-plan.md`; expected commit: `feat: add CEF-compatible mac application shell`)
4. [DONE] Git Commit: `feat: add CEF-compatible mac application shell` (hash: `de7c5ad37`)
5. [DONE] Переподключить `app_main_mac.mm` и `CMakeLists.txt` к новому bootstrap seam, сохранив текущий browser/window ownership в `LauncherApp` (scope: `packages/cef-launcher/src/platform/mac/app_main_mac.mm`, `packages/cef-launcher/CMakeLists.txt`, `doc/TODO/todo-plan.md`; expected commit: `fix: align mac launcher bootstrap with CEF sample`)
6. [DONE] Git Commit: `fix: align mac launcher bootstrap with CEF sample` (hash: `b6b0cf3d1`)

### Stream: Docs and release
7. [DONE] Синхронизировать launcher SSOT и системный инвариант под новый mac bootstrap contract (scope: `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: sync CEF mac bootstrap contract`)
8. [DONE] Git Commit: `docs: sync CEF mac bootstrap contract` (hash: `402ed621d`)
9. [DONE] Закрыть launcher bug entry после подтверждённого кода и сохранить usage-limits issues как backlog-only bugs (scope: `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record CEF mac launcher crash fix`)
10. [DONE] Git Commit: `docs: record CEF mac launcher crash fix` (hash: `cdb11f1ca`)
11. [DONE] Подготовить release metadata для версии `1.2.46` до запуска `build-all.sh` (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.46 release metadata`)
12. [TODO] Git Commit: `docs: prepare 1.2.46 release metadata` (hash: TBD)
13. [IN_PROGRESS] Прогнать таргетный launcher build и выполнить `./scripts/build-all.sh` с фиксацией release/version updates (scope: `packages/cef-launcher`, release/version manifests, `doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.46`)
14. [TODO] Git Commit: `chore: release 1.2.46` (hash: TBD)
15. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, заархивировать planning/todo артефакты, обновить `Docs_Index.md` и восстановить neutral stub `todo-plan` (scope: `doc/SolidWorks-WorkFlow/Plans`, `doc/TODO`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: archive CEF mac bootstrap hardening scope (1.2.46)`)
16. [TODO] Git Commit: `docs: archive CEF mac bootstrap hardening scope (1.2.46)` (hash: TBD)

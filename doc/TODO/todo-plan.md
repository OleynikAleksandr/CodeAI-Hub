# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Cycle:** 1.2.48 — CEF macOS Input + Quit Regression

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_Input_And_Quit_Regression_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_Input_And_Quit_Regression_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/CEF_MacOS_BootstrapHardening_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
  - `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.h`
  - `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.mm`
  - `packages/cef-launcher/src/platform/mac/app_main_mac.mm`
  - `packages/cef-launcher/src/launcher_handler.cc`
  - `packages/cef-launcher/src/launcher_handler.h`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading перед каждым фиксом:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача ≤ 3 файлов; после каждой — отдельный `Git Commit: ...`.
- Gates: pre-commit hooks (architecture/lint/knip/format), pre-push (dup/links).
- Targeted CEF launcher build запускаем после изменения `.mm`/`.h`: `./scripts/build-cef-launcher.sh --force --launcher-version 1.2.48`.
- Версии `package.json` не меняем вручную — это сделает `build-all.sh --version 1.2.48`.

## Phase 1 — CEF macOS Input + Quit Fix (owner: Codex, updated: 2026-04-22)

### Stream A: Restore standard terminate-path
1. [DONE] Убрать `-[CodeAIHubApplication terminate:]` override и метод `tryToTerminateApplication:`; заменить `applicationShouldTerminate:` на async browser-close implementation с `CloseAllBrowsers(true)` + `NSTerminateCancel`, возвращая `NSTerminateNow` когда active browsers нет. Файлы: `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.h`, `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.mm`. scope: 2 файла; commit: `fix(launcher-mac): route terminate through applicationShouldTerminate`.
2. [IN_PROGRESS] Git Commit: `fix(launcher-mac): route terminate through applicationShouldTerminate` (hash: TBD)

### Stream B: Remove Edit menu from app-menu
1. [TODO] Удалить Cut/Copy/Paste/SelectAll из `CreateApplicationMenu` в `codeai_hub_application_mac.mm`; оставить только `Quit %@` в app sub-menu. Chromium обрабатывает clipboard shortcuts на уровне render process. scope: 1 файл; commit: `fix(launcher-mac): drop edit menu to unblock clipboard shortcuts`.
2. [TODO] Git Commit: `fix(launcher-mac): drop edit menu to unblock clipboard shortcuts` (hash: TBD)

### Stream C: SSOT sync
1. [TODO] Обновить `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md` — canonical shutdown contract: standard `applicationShouldTerminate:` path, no Edit menu, no `terminate:` override. Обновить `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 — новый invariant 1.2.48. Обновить `doc/BugRegistry.md` — запись `BUG-2026-04-22-XX` (paste/SuperWhisper/Quit regression, fixed в 1.2.48). scope: 3 файла; commit: `docs: sync CEF macOS input/quit contract`.
2. [TODO] Git Commit: `docs: sync CEF macOS input/quit contract` (hash: TBD)

### Stream D: Release metadata (pre-build)
1. [TODO] Обновить `README.md` "Current Release — v1.2.48" и `CHANGELOG.md` новой секцией `## [1.2.48]` с описанием regression fix. scope: 2 файла; commit: `docs: prepare 1.2.48 release metadata`.
2. [TODO] Git Commit: `docs: prepare 1.2.48 release metadata` (hash: TBD)

### Stream E: Release build 1.2.48
1. [TODO] Запустить `./scripts/build-all.sh --version 1.2.48` на чистом дереве; скрипт пересоберёт CEF launcher + core + UI, поднимет версии, создаст tarball'ы. scope: только автогенерируемые version bumps; commit: `chore: release 1.2.48`.
2. [TODO] Git Commit: `chore: release 1.2.48` (hash: TBD)
3. [TODO] Запустить `./scripts/build-release.sh --use-current-version`; проверить `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`. Переложить VSIX и tarball'ы в `doc/tmp/releases/`. Build verification only — без отдельного commit.

### Stream F: Session closeout
1. [TODO] Переместить `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_Input_And_Quit_Regression_Architecture.md` → `doc/SolidWorks-WorkFlow/Plans/Archive/`. Переименовать этот todo-plan → `doc/TODO/Archive/todo-plan-phase1-cef-macos-input-quit-regression.md`. Создать свежий stub `doc/TODO/todo-plan.md`. Обновить `doc/SolidWorks-WorkFlow/Docs_Index.md`. scope: 4 перемещения + 1 stub; commit: `docs: archive 1.2.48 input/quit regression scope`.
2. [TODO] Git Commit: `docs: archive 1.2.48 input/quit regression scope` (hash: TBD)
3. [TODO] Написать `doc/Sessions/Session086.md` (Completion Report — Тип A). Файл остаётся uncommitted (gitignored).

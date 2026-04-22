# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Cycle:** 1.2.49 — CEF macOS Bootstrap Rollback

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_Bootstrap_Rollback_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_Bootstrap_Rollback_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/CEF_MacOS_BootstrapHardening_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/CEF_MacOS_Input_And_Quit_Regression_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
  - `doc/BugRegistry.md` (BUG-2026-04-22-01, BUG-2026-04-22-04)
  - Target baseline commit `70ac9a6ac` для `app_main_mac.mm`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- Каждая подзадача ≤ 3 файлов; после каждой — отдельный `Git Commit: ...`.
- Gates: pre-commit (architecture/lint/knip/format), pre-push (dup/links) — автоматически.
- Версии `package.json` не меняем вручную — `build-all.sh --version 1.2.49`.

## Phase 1 — CEF macOS Bootstrap Rollback (owner: Codex, updated: 2026-04-22)

### Stream A: Restore launcher source baseline
1. [TODO] Удалить `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.h` и `codeai_hub_application_mac.mm`. Восстановить `packages/cef-launcher/src/platform/mac/app_main_mac.mm` в состоянии коммита `70ac9a6ac`. Убрать обе `codeai_hub_application_mac.mm` entries из `packages/cef-launcher/CMakeLists.txt` (`PLATFORM_SOURCES` и `set_source_files_properties`). scope: 4 файла; commit: `revert(launcher-mac): drop CefAppProtocol shell and restore plain NSApplication bootstrap`.
2. [TODO] Git Commit: `revert(launcher-mac): drop CefAppProtocol shell and restore plain NSApplication bootstrap` (hash: TBD)

### Stream B: SSOT rollback
1. [TODO] `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — удалить Invariant 32 (1.2.46) и Invariant 33 (1.2.48) целиком. `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md` — редуцировать macOS Bootstrap Lifecycle Boundary секцию, отметив плоский NSApplication bootstrap + known deferred issue. `doc/BugRegistry.md` — переоткрыть `BUG-2026-04-22-01` как OPEN / DEFERRED; `BUG-2026-04-22-04` закрыть как FIXED в 1.2.49 через rollback с historical note. scope: 3 файла; commit: `docs: revert CEF macOS bootstrap SSOT to 1.2.45 baseline`.
2. [TODO] Git Commit: `docs: revert CEF macOS bootstrap SSOT to 1.2.45 baseline` (hash: TBD)

### Stream C: Release metadata 1.2.49
1. [TODO] `README.md` Current Release → v1.2.49 + 1.2.48 и 1.2.46 в previous. `CHANGELOG.md` `## [1.2.49]` секция про rollback. scope: 2 файла; commit: `docs: prepare 1.2.49 release metadata`.
2. [TODO] Git Commit: `docs: prepare 1.2.49 release metadata` (hash: TBD)

### Stream D: Release build 1.2.49
1. [TODO] `./scripts/build-all.sh --version 1.2.49` на чистом дереве.
2. [TODO] Git Commit: `chore: release 1.2.49` (hash: TBD)
3. [TODO] `./scripts/build-release.sh --use-current-version`.

### Stream E: Closeout
1. [TODO] Переместить planning-doc и todo-plan в Archive, возобновить stub, обновить Docs_Index. scope: 4 перемещения + 1 stub; commit: `docs: archive 1.2.49 rollback scope`.
2. [TODO] Git Commit: `docs: archive 1.2.49 rollback scope` (hash: TBD)
3. [TODO] Написать `doc/Sessions/Session087.md` (Completion Report). Файл остаётся uncommitted (gitignored).

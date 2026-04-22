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
1. [DONE] Удалить `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.h` и `codeai_hub_application_mac.mm`. Восстановить `packages/cef-launcher/src/platform/mac/app_main_mac.mm` в состоянии коммита `70ac9a6ac`. Убрать обе `codeai_hub_application_mac.mm` entries из `packages/cef-launcher/CMakeLists.txt` (`PLATFORM_SOURCES` и `set_source_files_properties`). scope: 4 файла; commit: `revert(launcher-mac): drop CefAppProtocol shell and restore plain NSApplication bootstrap`.
2. [DONE] Git Commit: `revert(launcher-mac): drop CefAppProtocol shell and restore plain NSApplication bootstrap` (hash: 8557b598b)

### Stream B: SSOT rollback
1. [DONE] `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — Invariant 32 переписан как rollback + deferred issue; Invariant 33 (1.2.48) удалён. `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md` — macOS Bootstrap Lifecycle Boundary редуцирована до плоского NSApplication bootstrap + known deferred issue. `doc/BugRegistry.md` — `BUG-2026-04-22-01` переоткрыт как DEFERRED с rollback note (historical 1.2.46 card сохранён); `BUG-2026-04-22-04` переведён в FIXED (via rollback in 1.2.49). scope: 3 файла; commit: `docs: revert CEF macOS bootstrap SSOT to 1.2.45 baseline`.
2. [DONE] Git Commit: `docs: revert CEF macOS bootstrap SSOT to 1.2.45 baseline` (hash: 9a1f8071b)

### Stream C: Release metadata 1.2.49
1. [DONE] `README.md` Current Release → v1.2.49 + 1.2.48 и 1.2.46 в previous (отмечены как reverted). `CHANGELOG.md` `## [1.2.49]` секция про rollback + deferred issue + docs sync. scope: 2 файла; commit: `docs: prepare 1.2.49 release metadata`.
2. [DONE] Git Commit: `docs: prepare 1.2.49 release metadata` (hash: 940b39af3)

### Stream D: Release build 1.2.49
1. [DONE] `./scripts/build-all.sh --version 1.2.49` на чистом дереве.
2. [DONE] Git Commit: `chore: release 1.2.49` (hash: 324af5cf7)
3. [DONE] `./scripts/build-release.sh --use-current-version` — VSIX `codeai-hub-1.2.49.vsix` (2.3M) создан, SDK exclusions verified, VSIX surface verified.

### Stream E: Closeout
1. [IN_PROGRESS] Переместить planning-doc и todo-plan в Archive, возобновить stub, обновить Docs_Index. scope: 4 перемещения + 1 stub; commit: `docs: archive 1.2.49 rollback scope`.
2. [IN_PROGRESS] Git Commit: `docs: archive 1.2.49 rollback scope` (hash: TBD)
3. [IN_PROGRESS] Написать `doc/Sessions/Session087.md` (Completion Report). Файл остаётся uncommitted (gitignored).

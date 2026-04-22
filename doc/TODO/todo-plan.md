# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Cycle:** 1.2.50 — CEF macOS Shutdown Crash Mitigation (NSUncaughtExceptionHandler)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_Shutdown_Crash_Mitigation_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_Shutdown_Crash_Mitigation_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/CEF_MacOS_Bootstrap_Rollback_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
  - `doc/BugRegistry.md` (BUG-2026-04-22-01)
  - `packages/cef-launcher/src/platform/mac/app_main_mac.mm`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- Каждая подзадача ≤ 3 файлов; после каждой — отдельный `Git Commit: ...`.
- Gates: pre-commit (architecture/lint/knip/format), pre-push (dup/links) автоматически.
- Версии `package.json` не меняем вручную — `build-all.sh --version 1.2.50`.

## Phase 1 — CEF macOS Shutdown Crash Mitigation (owner: Codex, updated: 2026-04-22)

### Stream A: Install uncaught exception handler
1. [DONE] В `packages/cef-launcher/src/platform/mac/app_main_mac.mm` добавить namespace-local `InstallCodeAIHubUncaughtExceptionHandler()`: сохранить previous handler via `NSGetUncaughtExceptionHandler()`, установить свой через `NSSetUncaughtExceptionHandler(...)`. Handler: если `NSInvalidArgumentException` с reason содержит `unrecognized selector sent to instance` и `NSApplication` — log в stderr `CodeAIHubLauncher: suppressed NSApplication unrecognized selector: ...` и return (swallow). Иначе — forward в previous handler. Вызов `InstallCodeAIHubUncaughtExceptionHandler()` из `main()` сразу после `CefScopedLibraryLoader`, до `CefExecuteProcess`. scope: 1 файл; commit: `fix(launcher-mac): suppress NSApplication unrecognized selector crash on window close`.
2. [IN_PROGRESS] Git Commit: `fix(launcher-mac): suppress NSApplication unrecognized selector crash on window close` (hash: TBD)

### Stream B: SSOT sync
1. [TODO] `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 Invariant 32 — дополнить mitigation note (1.2.50 NSUncaughtExceptionHandler) + pending CEF upgrade. `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md` — macOS Bootstrap Lifecycle Boundary subsection про 1.2.50 mitigation. `doc/BugRegistry.md` — `BUG-2026-04-22-01` → Status `MITIGATED` с narrative про window-close trigger и exception handler workaround. scope: 3 файла; commit: `docs: sync 1.2.50 shutdown crash mitigation contract`.
2. [TODO] Git Commit: `docs: sync 1.2.50 shutdown crash mitigation contract` (hash: TBD)

### Stream C: Release metadata 1.2.50
1. [TODO] `README.md` Current Release → v1.2.50 + 1.2.49 в previous. `CHANGELOG.md` `## [1.2.50]` секция про mitigation и pending proper fix. scope: 2 файла; commit: `docs: prepare 1.2.50 release metadata`.
2. [TODO] Git Commit: `docs: prepare 1.2.50 release metadata` (hash: TBD)

### Stream D: Release build 1.2.50
1. [TODO] `./scripts/build-all.sh --version 1.2.50` на чистом дереве.
2. [TODO] Git Commit: `chore: release 1.2.50` (hash: TBD)
3. [TODO] `./scripts/build-release.sh --use-current-version`.

### Stream E: Closeout
1. [TODO] Переместить planning-doc и todo-plan в Archive, возобновить stub, обновить Docs_Index. scope: 4 перемещения + 1 stub; commit: `docs: archive 1.2.50 shutdown crash mitigation scope`.
2. [TODO] Git Commit: `docs: archive 1.2.50 shutdown crash mitigation scope` (hash: TBD)
3. [TODO] Написать `doc/Sessions/Session088.md` (Completion Report). Файл остаётся uncommitted (gitignored).

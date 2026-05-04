# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Cycle:** 1.2.52 — CEF macOS CanClose Short-Circuit (real fix after 3 failed mitigation attempts)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_CanClose_ShortCircuit_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_CanClose_ShortCircuit_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/CEF_MacOS_ReportException_Swizzle_Architecture.md` (1.2.51 failed)
  - `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
  - `doc/BugRegistry.md` (BUG-2026-04-22-01)
  - `packages/cef-launcher/src/launcher_app.cc` (LauncherWindowDelegate::CanClose)
  - `packages/cef-launcher/src/launcher_handler.h`
  - `packages/cef-launcher/src/platform/mac/launcher_handler_mac.mm`
- Только этот список — источник документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- Каждая подзадача ≤ 3 файлов; после каждой — отдельный `Git Commit: ...`.
- Gates: pre-commit (architecture/lint/knip/format), pre-push (dup/links) автоматически.
- Версии `package.json` не меняем вручную — `build-all.sh --version 1.2.52`.

## Phase 1 — CEF macOS CanClose Short-Circuit (owner: Codex, updated: 2026-04-22)

### Stream A: Short-circuit CanClose via [NSApp terminate:]
1. [DONE] Declaration `codeai::launcher::RequestNativeApplicationTermination()` добавлен в `launcher_handler.h` (namespace `codeai::launcher`). Implementation в `launcher_handler_mac.mm` — `[NSApp terminate:nil]` с подробным контекстом. `launcher_app.cc` `LauncherWindowDelegate::CanClose` получил `#if defined(__APPLE__)` branch: вызов `RequestNativeApplicationTermination()` + `return false`; `#else` branch оставляет existing `TryCloseBrowser` flow для Win/Linux. scope: 3 файла; commit: `fix(launcher-mac): short-circuit CanClose to [NSApp terminate:] bypassing buggy Chromium teardown`.
2. [DONE] Git Commit: `fix(launcher-mac): short-circuit CanClose to [NSApp terminate:] bypassing buggy Chromium teardown` (hash: 9fbd2dfaf)

### Stream B: SSOT sync
1. [DONE] `SystemArchitecture.md` §3 Invariant 32 переписан: 1.2.52 short-circuit как primary fix, 1.2.51 swizzle retained как safety net, оба predшественника (1.2.50/1.2.51) explicitly noted как failed. Канон-список обновлён. `Launcher_CEF.md` получил новую subsection "Shutdown-crash primary fix (1.2.52 — CanClose short-circuit)" перед 1.2.51 subsection, которая помечена как superseded-but-retained. `BugRegistry.md` `BUG-2026-04-22-01` → Status FIXED; current resolution block переписан под short-circuit; 1.2.51 attempt сохранён как "Superseded attempts". scope: 3 файла; commit: `docs: sync 1.2.52 CanClose short-circuit contract`.
2. [DONE] Git Commit: `docs: sync 1.2.52 CanClose short-circuit contract` (hash: bb086b95a)

### Stream C: Release metadata 1.2.52
1. [DONE] `README.md` Current Release → v1.2.52 с описанием short-circuit pivot'а; 1.2.51 в previous (marked: "swizzle alone not sufficient; retained as safety net"). `CHANGELOG.md` `## [1.2.52]` секция с Fixed / Changed / Retained as safety net / Known deferred issue / Not touched / Docs subsections. scope: 2 файла; commit: `docs: prepare 1.2.52 release metadata`.
2. [IN_PROGRESS] Git Commit: `docs: prepare 1.2.52 release metadata` (hash: TBD)

### Stream D: Release build 1.2.52
1. [DONE] `./scripts/build-all.sh --version 1.2.52` на чистом дереве.
2. [DONE] Git Commit: `chore: release 1.2.52` (hash: 1c8982c6b)
3. [DONE] `./scripts/build-release.sh --use-current-version` — VSIX `codeai-hub-1.2.52.vsix` (2.3M) создан.

### Stream E: Closeout
1. [IN_PROGRESS] Переместить planning-doc и todo-plan в Archive, возобновить stub, обновить Docs_Index. scope: 4 перемещения + 1 stub; commit: `docs: archive 1.2.52 CanClose short-circuit scope`.
2. [IN_PROGRESS] Git Commit: `docs: archive 1.2.52 CanClose short-circuit scope` (hash: TBD)
3. [IN_PROGRESS] Написать `legacy session report (removed)` (1.2.51 retroactive closeout — swizzle failed) и `legacy session report (removed)` (1.2.52 Completion Report). Оба gitignored.

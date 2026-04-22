# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Cycle:** 1.2.51 — CEF macOS reportException: Swizzle (follow-up to failed 1.2.50 mitigation)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_ReportException_Swizzle_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/CEF_MacOS_ReportException_Swizzle_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/CEF_MacOS_Shutdown_Crash_Mitigation_Architecture.md` (1.2.50 failed attempt)
  - `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
  - `doc/BugRegistry.md` (BUG-2026-04-22-01)
  - `packages/cef-launcher/src/platform/mac/app_main_mac.mm`
- Только этот список — источник документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- Каждая подзадача ≤ 3 файлов; после каждой — отдельный `Git Commit: ...`.
- Gates: pre-commit (architecture/lint/knip/format), pre-push (dup/links) автоматически.
- Версии `package.json` не меняем вручную — `build-all.sh --version 1.2.51`.

## Phase 1 — CEF macOS reportException Swizzle (owner: Codex, updated: 2026-04-22)

### Stream A: Swap NSSetUncaughtExceptionHandler for reportException: swizzle
1. [DONE] В `packages/cef-launcher/src/platform/mac/app_main_mac.mm`:
   - Удалён dead 1.2.50 код: `g_previous_uncaught_handler`, `CodeAIHubUncaughtExceptionHandler()`, `InstallCodeAIHubUncaughtExceptionHandler()`, вызов из `main()`.
   - Добавлен `#include <objc/runtime.h>` + category `NSApplication (CodeAIHubReportExceptionSuppression)` с `codeai_reportException:` и `+load` swizzle через `method_exchangeImplementations`.
   - Matching filter: `NSInvalidArgumentException` + reason содержит `unrecognized selector sent to instance` + reason содержит `NSApplication` → log в stderr + return. Остальные exceptions — forward в original IMP через `[self codeai_reportException:exception]` (swizzle trampoline).
   scope: 1 файл; commit: `fix(launcher-mac): swizzle -[NSApplication reportException:] to suppress CEF/macOS 26 crash`.
2. [DONE] Git Commit: `fix(launcher-mac): swizzle -[NSApplication reportException:] to suppress CEF/macOS 26 crash` (hash: 77149ac34)

### Stream B: SSOT sync
1. [DONE] `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 Invariant 32 переписан: 1.2.50 NSSetUncaughtExceptionHandler подход отмечен как failed, 1.2.51 использует reportException swizzle. `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md` "Shutdown-crash mitigation" subsection полностью переписан под swizzle (trigger + root cause + почему 1.2.50 не сработал + 1.2.51 mechanism + границы применимости). `doc/BugRegistry.md` `BUG-2026-04-22-01` Status остаётся MITIGATED но current resolution теперь про swizzle; 1.2.50 failed attempt сохранён как timeline entry. scope: 3 файла; commit: `docs: sync 1.2.51 reportException swizzle mitigation`.
2. [DONE] Git Commit: `docs: sync 1.2.51 reportException swizzle mitigation` (hash: d5e0ed63d)

### Stream C: Release metadata 1.2.51
1. [DONE] `README.md` Current Release → v1.2.51 с объяснением что 1.2.50 не сработал и перешли на method swizzle; 1.2.50 явно помечен как "mitigation failed, replaced in 1.2.51". `CHANGELOG.md` `## [1.2.51]` секция с Fixed / Changed / Known deferred issue / Not touched / Docs subsections, документирующая exact swizzle mechanics. scope: 2 файла; commit: `docs: prepare 1.2.51 release metadata`.
2. [IN_PROGRESS] Git Commit: `docs: prepare 1.2.51 release metadata` (hash: TBD)

### Stream D: Release build 1.2.51
1. [TODO] `./scripts/build-all.sh --version 1.2.51` на чистом дереве.
2. [TODO] Git Commit: `chore: release 1.2.51` (hash: TBD)
3. [TODO] `./scripts/build-release.sh --use-current-version`.

### Stream E: Closeout
1. [TODO] Переместить planning-doc и todo-plan в Archive, возобновить stub, обновить Docs_Index. scope: 4 перемещения + 1 stub; commit: `docs: archive 1.2.51 reportException swizzle scope`.
2. [TODO] Git Commit: `docs: archive 1.2.51 reportException swizzle scope` (hash: TBD)
3. [TODO] Написать `doc/Sessions/Session089.md` (Completion Report). Файл остаётся uncommitted (gitignored).

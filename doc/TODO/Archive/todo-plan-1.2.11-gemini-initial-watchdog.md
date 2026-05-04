# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Gemini_InitialWatchdog_Bump_1.2.11.md`
- **Read this context before implementation:**
  - `legacy session report (removed)` (предыстория: 1.2.9 retest + 1.2.10 audit cycle)
  - `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts` (единственный файл с константой watchdog)
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (Invariant 7 про provider-segment preservation — упоминает stalled-turn watchdog)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- Gates автоматически через Husky. Таргетные сборки — перед закрытием Stream.
- Real-time документация: обновляем SSOT в том же коммите что и код.

## Phase 1 — Gemini Initial-Leg Watchdog Bump 1.2.11 (owner: Claude, updated: 2026-04-17)

### Stream 1: Release notes pre-bump to 1.2.11
1. [TODO] Обновить `README.md` (Current Release → v1.2.11, 1.2.10 → "(previous)") и `CHANGELOG.md` ([1.2.11] секция). — scope: 2 файла; ожидаемый commit: `docs: prepare 1.2.11 release notes for Gemini initial-leg watchdog bump`
2. [TODO] Git Commit: `docs: prepare 1.2.11 release notes for Gemini initial-leg watchdog bump` (hash: TBD)

### Stream 2: Watchdog constant bump + SSOT update
1. [TODO] В `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts` изменить `DEFAULT_STALLED_TURN_WATCHDOG_MS = 60_000` → `240_000`. Обновить Invariant 7 Gemini branch в `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` + `Modules/Gemini.md` с новой константой. — scope: 3 файла; ожидаемый commit: `fix(gemini): bump initial-leg stalled-turn watchdog to 240s`
2. [TODO] Git Commit: `fix(gemini): bump initial-leg stalled-turn watchdog to 240s` (hash: TBD)

### Stream 3: Planning archive
1. [TODO] Planning-doc `Gemini_InitialWatchdog_Bump_1.2.11.md` → `Plans/Archive/`; обновить `Docs_Index.md`. — scope: 2 файла; ожидаемый commit: `docs: archive 1.2.11 Gemini initial-watchdog planning doc`
2. [TODO] Git Commit: `docs: archive 1.2.11 Gemini initial-watchdog planning doc` (hash: TBD)

### Stream 4: Release build 1.2.11
1. [TODO] Verify чистое дерево, запустить `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.
2. [TODO] Git Commit: `chore: bump version to 1.2.11 for Gemini initial-leg watchdog bump release` (hash: TBD)
3. [TODO] Archive todo-plan в `doc/TODO/Archive/todo-plan-1.2.11-gemini-initial-watchdog.md`; reset active к empty-scope placeholder.
4. [TODO] Git Commit: `docs: close 1.2.11 todo-plan after build` (hash: TBD)

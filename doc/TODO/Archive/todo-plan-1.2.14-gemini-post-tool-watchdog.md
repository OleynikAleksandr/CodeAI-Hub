# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Gemini_PostToolWatchdog_Bump_1.2.14.md`
- **Read this context before implementation:**
  - `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts` (единственный файл с константой watchdog)
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (Invariant 7 Gemini extension)
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md` (stalled-turn contract)
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Gemini_InitialWatchdog_Bump_1.2.11.md` (precedent cycle — когда initial был поднят 60→240)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Gates автоматически через Husky.
- Real-time документация: обновляем SSOT в том же коммите что и код.

## Phase 1 — Gemini Post-Tool Watchdog Bump 1.2.14 (owner: Claude, updated: 2026-04-17)

### Stream 1: Release notes pre-bump to 1.2.14
1. [TODO] README.md + CHANGELOG.md на v1.2.14. — scope: 2 файла; commit: `docs: prepare 1.2.14 release notes for Gemini post-tool watchdog bump`
2. [TODO] Git Commit: `docs: prepare 1.2.14 release notes for Gemini post-tool watchdog bump` (hash: TBD)

### Stream 2: Post-tool watchdog constant bump + SSOT update
1. [TODO] В `gemini-session-lifecycle.ts` изменить `DEFAULT_POST_TOOL_STALLED_TURN_WATCHDOG_MS = 120_000 → 240_000`. Обновить `Modules/Gemini.md` stalled-turn bullet с новыми значениями. — scope: 2 файла; commit: `fix(gemini): bump post-tool stalled-turn watchdog to 240s`
2. [TODO] Git Commit: `fix(gemini): bump post-tool stalled-turn watchdog to 240s` (hash: TBD)

### Stream 3: Planning archive
1. [TODO] Planning-doc → `Plans/Archive/`; `Docs_Index.md` entry. — scope: 2 файла; commit: `docs: archive 1.2.14 Gemini post-tool watchdog planning doc`
2. [TODO] Git Commit: `docs: archive 1.2.14 Gemini post-tool watchdog planning doc` (hash: TBD)

### Stream 4: Release build 1.2.14
1. [TODO] build-all.sh + build-release.sh.
2. [TODO] Git Commit: `chore: bump version to 1.2.14 for Gemini post-tool watchdog bump release` (hash: TBD)
3. [TODO] Archive todo-plan; reset empty.
4. [TODO] Git Commit: `docs: close 1.2.14 todo-plan after build` (hash: TBD)

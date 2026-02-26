# Session 035 — Phase 258: workspace-scoped task timer storage + Release v1.1.676

**Date:** 2026-02-26 08:30 (CET)
**Branch:** main
**Version:** 1.1.676

---

# 1. Work Done in This Session

## Work summary
- Refactored `TaskTimerStorage` to store `task-timers.json` inside each workspace
  (`<workspaceRoot>/.codeai-hub/state/task-timers.json`) instead of global `~/.codeai-hub/state/`.
- Added `TaskTimerStorage.cleanupLegacy()` — best-effort removal of the old global file on startup.
- Simplified persisted format: schema v2 with flat `{ schemaVersion, totals }` (removed `workspaces` nesting).
- Adapted `WorkspaceRuntimeFacade`: per-workspace storage instances via `taskTimerStorageFactory`,
  `getOrCreateStorage()` helper, `persistTaskTimers()` now writes to each workspace separately.
- Updated test: `preserves task timer totals across Stop/Play restarts` uses `taskTimerStorageFactory`.
- Release build v1.1.676.

## Build / verification
- `npm run build --workspace packages/core` ✅
- `./scripts/build-all.sh` ✅
- `./scripts/build-release.sh --use-current-version` ✅ (`✅ Package created`)
- Artifacts:
  - `doc/tmp/releases/codeai-hub-1.1.676.vsix`

## Git commits
- `51dfb42e refactor(core): make task timer storage workspace-scoped`
- `d7a5861d refactor(core): use per-workspace task timer storage`
- `fc260f6a test(core): adapt task timer tests for workspace-scoped storage`
- `c874e76e docs(todo): record Phase 258 hashes (streams 0-3)`
- `df29ffaa chore(release): build-all`
- (+ chore(release): package vsix — hash TBD)

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session035.md` (THIS REPORT)

## Plans for next session
- Install `doc/tmp/releases/codeai-hub-1.1.676.vsix` and verify that clearing
  `.codeai-hub/` in a workspace correctly resets the Total timer to zero.
- Continue with other bugs from BugRegistry or new features.

# Session 002 — Project Manager Workspace Startup Reset Planning

**Date:** 2026-04-07 09:06 (CEST)
**Branch:** main
**Version:** 1.1.898
**Execution Scope Status:** ACTIVE

---

# 1. Work Done in This Session

## Work summary
- Restored context from the latest session report, the base SSOT, and the docs index before opening a new planning scope.
- Investigated the Project Manager workspace-switch mismatch in detail and traced the split truth between continuity recency, `workflow/state.json lastActive`, startup auto-select, artifact availability probes, and runtime session fallback.
- Verified on the affected workspace that `workflow/state.json` currently points to `virtual_simulation` even though `foundation-envelope.md` exists and is newer as a semantic artifact.
- Agreed the temporary product rule for the next implementation wave: `workspace open => Description`, with explicit user clicks remaining the only source of stage changes after startup.
- Finalized the previously pending `Session001` report so the active session history block is now committed and cleanly closed.
- Created the planning document `doc/SolidWorks-WorkFlow/Plans/ProjectManager_WorkspaceStartup_Reset_Architecture.md`.
- Replaced the placeholder `doc/TODO/todo-plan.md` with a new active execution plan for the workspace-startup reset scope, including explicit cleanup of obsolete startup heuristics.
- No tests or builds were run in this session because the work stopped at analysis and planning.

## Git commits
(IMPORTANT: when `Execution Scope Status: ACTIVE`, the next session must inspect every commit listed here via `git show --stat <hash>` and `git show <hash>`.)
- `bdff0d8d4 docs(session): finalize session001 report`
- `14212d350 docs(pm): plan workspace startup reset`

---

# 2. Instructions for Next Session

**Recovery Owner:** `doc/TODO/todo-plan.md`

## Plans for next session
- Continue the active execution scope from `doc/TODO/todo-plan.md`.
- Read the current cycle context pack listed in `doc/TODO/todo-plan.md` before implementation.
- Start with `Phase 1 / Stream: Core Startup Truth`.
- Keep the temporary startup contract fixed to `workspace open => Description`.
- Remove obsolete recency-based startup heuristics instead of leaving them as hidden fallback selectors.

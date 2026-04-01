# Session 015 — Staged Core Restart Release 1.1.861

**Date:** 2026-04-01 12:43 CEST
**Branch:** main
**Version:** 1.1.861

---

# 1. Work Done in This Session

## Work summary
- Added staged `Restart Core` flow in Settings so the button now shows interactive states and live progress feedback during `stop -> wait -> start`.
- Reworked the extension restart path to post explicit status updates into the Settings UI while keeping the actual stop/start orchestration inside the existing core process manager.
- Synchronized release-facing documents for `1.1.861`, then completed `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version` successfully.

## Git commits
- `b8528555 fix(settings): add staged core restart feedback`
- `27d7e5ea build(release): assemble staged core restart release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session015.md` (THIS REPORT)

> Then open the relevant documents from `doc/SolidWorks-WorkFlow/Clusters/`, `doc/SolidWorks-WorkFlow/Modules/`, and `doc/SolidWorks-WorkFlow/Contracts/` for the next task.

## Plans for next session
- Validate release `1.1.861` in the installed extension and confirm the staged restart feedback behaves correctly against a real core restart cycle.
- If the next task expands the Settings/Core surface further, start with a planning document in `doc/SolidWorks-WorkFlow/Plans/` before cutting a new `doc/TODO/todo-plan.md`.

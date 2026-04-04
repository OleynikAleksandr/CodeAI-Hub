# Development TODO Plan

## Execution Rules
- Required reading before starting a new scope:
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Start a new `todo-plan.md` only after an approved planning doc exists under `doc/SolidWorks-WorkFlow/Plans/`.
- Keep each micro-task within `<= 3 files` and follow each implementation line with a separate `Git Commit:` line.
- Sync SSOT docs in the same commit whenever architecture or runtime behavior changes.
- Before the next release handoff, run targeted builds for touched packages/clients, then `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`.

## Active Status
- No active phases.
- The completed Claude thinking translation release plan is archived at `doc/TODO/Archive/todo-plan-up-to-phase1-claude-thinking-translation-release-1.1.883-2026-04-04.md`.
- Start the next scope from a newly approved planning doc.

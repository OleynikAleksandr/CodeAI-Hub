# Development TODO Plan

## Execution Rules
- Required reading before each new fix:
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Before any new implementation scope, create or update an approved planning doc in `doc/SolidWorks-WorkFlow/Plans/`.
- Keep each micro-task within `<= 3 files`.
- Every implementation line must be followed by a separate `Git Commit:` line.
- Update docs in real time when logic or architecture changes.
- Before release handoff, run targeted builds/tests for touched packages, then `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`.

## Active Status
- No active approved execution phase is open.
- The previous fully completed plan is archived at `doc/TODO/Archive/todo-plan-up-to-phase5-codex-thinking-visibility-and-settings-save-overlay-release-1.1.887-2026-04-04.md`.
- The next implementation scope must start from a new approved planning doc in `doc/SolidWorks-WorkFlow/Plans/`.

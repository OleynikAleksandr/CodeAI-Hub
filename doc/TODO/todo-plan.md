# Development TODO Plan

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_Progress_Update_NonTerminal_1.2.95.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Codex_Progress_Update_NonTerminal_1.2.95.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the context source for the current execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Every task must touch no more than 3 files. If implementation proves wider, split the task before editing.
- Every implementation task is followed by a separate `Git Commit` item.
- Do not bypass Husky hooks or quality gates.
- Do not manually edit package versions; release scripts own version bumps.
- Keep docs synchronized in the same commit when logic changes.

## Phase 1 - Non-Terminal Codex Progress Guard (owner: Codex, updated: 2026-04-27)

### Stream: Provider-level prompt rule

1. [DONE] Archive completed provider SDK log-removal scope and create the approved 1.2.95 planning/todo cycle; scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-phase4-provider-sdk-logs-removal-1.2.94.md`, `doc/SolidWorks-WorkFlow/Plans/Codex_Progress_Update_NonTerminal_1.2.95.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Provider_SDK_Logs_Removal_Refactor_1.2.94.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: start codex progress guard scope`
2. [DONE] Git Commit: `docs: start codex progress guard scope` (hash: `6474ade50`)
3. [DONE] Add a short non-terminal progress-update rule to the shared Codex workflow prompt and synced prompt artifact; scope: `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts`, `doc/SolidWorks-WorkFlow/Plans/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis/Codex_My_System_Prompt.md`; expected commit message: `fix: keep codex progress updates non-terminal`; result: prompt sections match and `npm run build --workspace @codeai-hub/codex-app-server-module` passed
4. [TODO] Git Commit: `fix: keep codex progress updates non-terminal` (hash: TBD)
5. [TODO] Update Codex SSOT / Docs Index and verify no Description templates changed; scope: `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: record codex progress update guard`
6. [TODO] Git Commit: `docs: record codex progress update guard` (hash: TBD)
7. [TODO] Prepare release docs for `1.2.95`; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: prepare codex progress guard release`
8. [TODO] Git Commit: `docs: prepare codex progress guard release` (hash: TBD)
9. [TODO] Build release with normal version bump; scope: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, `doc/tmp/releases/`; expected commit message: `chore: build codex progress guard release`
10. [TODO] Git Commit: `chore: build codex progress guard release` (hash: TBD)
